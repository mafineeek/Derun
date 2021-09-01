import { Intent } from './BitFields/Intent'
import { ActivityType, OPCode, SlashCommandType } from './constants'
import { RestAPIError } from './Errors/RestAPIError'
import { sleep } from './functions'
import { User } from './Structures/User'
import { SlashCommand, SlashCommandBase } from './Typings/command'
import { ClientEvents } from './Typings/events'
import { Activity, Payload } from './Typings/gateway'
import { ClientOptions } from './Typings/options'
import { Collection } from './Util/Collection'
import { EventEmitter } from './Util/EventEmitter'
import { RequestHandler } from './Util/RequestHandler'
import { Shard } from './Util/Shard'

/** Utility class that can hold a bunch of {@link Shard shards}. This core class connects all the caching, rest and gateway elements. */
export class Client extends EventEmitter<ClientEvents> {
    constructor(token: string, options: ClientOptions) {
        super()

        if (!options.shardCount) options.shardCount = 'auto'
        else if (options.shardCount < 1) options.shardCount = 1

        if (!options.intents) options.intents = ['GUILDS']
        if (!options.connectionTimeout) options.connectionTimeout = 30000

        options.intents = Number(new Intent(options.intents).valueOf())

        if (!options.largeThreshold) options.largeThreshold = 50
        else if (options.largeThreshold > 250) options.largeThreshold = 250
        else if (options.largeThreshold < 50) options.largeThreshold = 50

        if (!options.requestTimeout) options.requestTimeout = 15000
        else if (options.requestTimeout < 15000) options.requestTimeout = 10000

        if (!options.requestCleanInterval) options.requestCleanInterval = 300000
        else if (options.requestCleanInterval < 30000) options.requestCleanInterval = 30000

        if (!options.restTimeOffset) options.restTimeOffset = 750
        else if (options.restTimeOffset < 300) options.restTimeOffset = 300

        if (!options.emitRawPayloads) options.emitRawPayloads = false

        this.token = token
        this.coreOptions = options
        this.restHandler = new RequestHandler(this)
    }

    /** User Bot Account details. Available after initialization *(firing ready event)*. */
    user?: User
    readonly shards = new Collection<Shard>()
    readonly coreOptions
    readonly token
    readonly restHandler
    readonly #commands = new Collection<SlashCommand>()
    readonly #nameRegex = /^[\w-]{1,32}$/
    #initialized = false
    #maxConcurrency = 1 // It will be used later if Derun will ever support big sharding (for bots with over 150k guilds).

    /** Adds your command into bot's cache. Call {@link Client.addCommand Client#updateCommands} to push changes into Discord when you'll be ready. */
    addCommand(cmd: SlashCommand) {
        if (this.#commands.size >= 100) throw new Error("You cannot register more than 100 slash commands. You've reached Discord's limit.")

        if (!cmd.name || typeof cmd.name !== 'string' || !this.#nameRegex.test(cmd.name)) throw new TypeError('Command name needs to be a lowercase string, no longer than 32 characters. It also cannot use any special characters neither spaces.')
        if (!cmd.description || typeof cmd.description !== 'string' || cmd.description.length > 100) throw new TypeError('Command description needs to be a string no longer than 100 characters.')
        if (cmd.default_permission && typeof cmd.default_permission !== 'boolean') throw new TypeError('Command default_permission needs to be a boolean.')
        if (cmd.type && (typeof cmd.type !== 'number' || cmd.type > 2)) throw new TypeError('Command type needs to be a number. Set to 1 for "SUB_COMMAND" or 2 to "SUB_COMMAND_GROUP".')

        if (cmd.options) {
            if (Array.isArray(cmd.options) && cmd.options.length > 0) {
                if (cmd.options.length > 25) throw new Error("You cannot assign more than 25 options per command. You've reached Discord's limit.")

                cmd.options.forEach((option, index) => {
                    if (!option.name || typeof option.name !== 'string' || !this.#nameRegex.test(option.name)) throw new TypeError(`Command options[${index}].name needs to be a lowercase string, no longer than 32 characters. It also cannot use any special characters neither spaces.`)
                    if (!option.description || typeof option.description !== 'string' || option.description.length > 100) throw new TypeError(`Command options[${index}].description needs to be a string no longer than 100 characters.`)
                    if (!option.type || typeof option.type !== 'number') throw new TypeError(`Command options[${index}].type needs to be a number. Check discord documentation for details: https://discord.com/developers/docs/interactions/application-commands#application-command-object-application-command-option-type`)
                    if (option.required && typeof option.required !== 'boolean') throw new TypeError(`Command options[${index}].description needs to be a boolean.`)

                    if (option.choices) {
                        if (Array.isArray(option.choices) && option.choices.length > 0) {
                            if (option.choices.length) throw new TypeError(`Command options[${index}].choices is too large! You cannot assign more than 25 choices per option.`)

                            option.choices.forEach((choice, idx) => {
                                if (!choice.name || typeof choice.name !== 'string' || choice.name.length > 100) throw new TypeError(`Command options[${index}].choices[${idx}].name needs to be a string no longer than 100 characters.`)
                                if (!choice.value || (typeof choice.value !== 'string' && typeof choice.value !== 'number') || (typeof choice.value === 'string' && choice.value.length > 100)) throw new TypeError(`Command options[${index}].choices[${idx}].value needs to be either a string (up to 100 characters length) or number.`)
                            })
                        } else delete cmd.options[index].choices
                    }

                    // Block infinite nesting
                    if (option.options) delete cmd.options[index].options
                })
            } else delete cmd.options
        }

        if (!cmd.type) cmd.type = SlashCommandType.SUB_COMMAND

        if (!cmd.extended) cmd.extended = {}
        if (typeof cmd.extended !== 'object') throw new TypeError('Command extended needs to be an object.')

        if (!cmd.run || typeof cmd.run !== 'function') throw new TypeError('Command run needs to be an function. This code snipped will be run when somebody will trigger your command.')

        this.#commands.set(cmd.name, cmd)
    }

    /** Removes command from bot's cache which means it will no longer be visible. Call {@link Client.addCommand Client#updateCommands} to push changes *(remove it from Discord as well)*. */
    removeCommand(name: string) {
        return this.#commands.delete(name)
    }

    /** Resolve command object from bot's cache. */
    findCommand(name: string) {
        return this.#commands.get(name)
    }

    /** Overwrites your slash commands with those you added using {@link Client.addCommand Client#addCommand}. Provide guild id for local push or execute with no parameters for global update. */
    async updateCommands(guildId?: string) {
        if (!this.user) throw new Error('You cannot modify commands without having bot ready.')

        const payload = new Array<SlashCommandBase>()

        for (const command of this.#commands.values()) {
            delete command.extended
            delete command.run
            payload.push(command)
        }

        const route = guildId ? `/applications/${this.user.id}/guilds/${guildId}/commands` : `/applications/${this.user.id}/commands`

        const [data, err] = await this.restHandler.request('PUT', route, true, payload)
        if (!data || data?.message === '401: Unauthorized') throw new RestAPIError(401, 'Invalid token')
        if (err) throw err

        // Assume at this point that everything went nicely.
        // It should get back array with all commands we just sent.
    }

    /** Sends raw payload across all shards. */
    broadcast(payload: Payload) {
        for (const shard of this.shards.values()) shard.send(payload)
    }

    /** Sets custom status for bot user. You can add shard id in second param to enable it only there. */
    editStatus(activity: Activity, shardId?: number) {
        const payload = {
            op: OPCode.PRESENCE_UPDATE,
            d: {
                game: {
                    name: activity.name && typeof activity.name === 'string' ? activity.name : null,
                    type: activity.type && typeof activity.type === 'number' ? ActivityType[activity.type] : 0,
                    url: activity.url && typeof activity.url === 'string' && activity.type === 'Streaming' ? activity.url : null
                },
                status: activity?.status ?? 'online',
                since: Date.now(),
                afk: false
            }
        }

        if (shardId) this.shards.get(shardId.toString())?.send(payload)
        else this.broadcast(payload)
    }

    /** Tells all shards to connect. Your bot will be marked as working once last shard will connect to the network. Listen to "ready" event to acknowledge this moment. */
    async connect(): Promise<void> {
        if (this.#initialized) return
        this.#initialized = true

        return new Promise(async (resolve) => {
            // It should never throw any error, so I'm gonna ignore it for now.
            const [data, err] = await this.restHandler.request('GET', '/gateway/bot', true)
            if (!data || data?.message === '401: Unauthorized') throw new RestAPIError(401, 'Invalid token')

            if (this.coreOptions.shardCount === 'auto') this.coreOptions.shardCount = data.shards ?? 1
            if (data.session_start_limit.remaining < this.coreOptions.shardCount) throw new RestAPIError(429, `This token was used to launch over ${data.session_start_limit.times} sessions. Discord decided to block it for another ${(data.session_start_limit.reset_after / 1000 / 60).toFixed(1)} minute(s)`)

            this.#maxConcurrency = data.session_start_limit.max_concurrency ?? 1

            const createShard = async (id: number): Promise<void> => {
                return new Promise(async (resolve) => {
                    this.shards.set(id.toString(), new Shard(this, id))

                    this.once('shardReady', async (shardId) => {
                        if (shardId === id) {
                            if (shardId + 1 === this.coreOptions.shardCount) this.emit('ready')
                            await sleep(5000)
                            return resolve()
                        } else throw new Error('Failed to launch shards in order! Check your internet connection and try again.')
                    })
                })
            }

            for (let i = 0; i < this.coreOptions.shardCount; i++) await createShard(i)
            resolve()
        })
    }
}
