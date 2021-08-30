import { MessageContent } from '../Typings/message'
import { ClientOptions } from '../Typings/options'
import { ShardManager } from '../WebSocket/ShardManager'
import { RestAPIError } from '../Errors/RestAPIError'
import { Collection } from './Collection'
import { SlashCommand } from '../Typings/command'

export class Client extends ShardManager {
    constructor(token: string, options: ClientOptions) {
        super(token, options)
    }

    readonly #commands = new Collection<SlashCommand>()
    readonly #nameRegex = /^[\w-]{1,32}$/

    registerCommand(cmd: SlashCommand) {
        if (this.#commands.size >= 100) throw new Error("You cannot register more than 100 slash commands. You've reached Discord's limit.")

        if (!cmd.name || typeof cmd.name !== 'string' || !this.#nameRegex.test(cmd.name)) throw new TypeError('Command name needs to be a lowercase string, no longer than 32 characters. It also cannot use any special characters neither spaces.')
        if (!cmd.description || typeof cmd.description !== 'string' || cmd.description.length > 100) throw new TypeError('Command description needs to be a string no longer than 100 characters.')
        if (cmd.default_permission && typeof cmd.default_permission !== 'boolean') throw new TypeError('Command default_permission needs to be a boolean.')
        if (!cmd.type || typeof cmd.type !== 'number' || cmd.type > 2) throw new TypeError('Command type needs to be a number. Set to 1 for "SUB_COMMAND" or 2 to "SUB_COMMAND_GROUP".')

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

        if (!cmd.extended) cmd.extended = {}
        if (typeof cmd.extended !== 'object') throw new TypeError('Command extended needs to be an object.')

        if (!cmd.run || typeof cmd.run !== 'function') throw new TypeError('Command run needs to be an function. This code snipped will be run when somebody will trigger your command.')

        this.#commands.set(cmd.name, cmd)
    }

    /**
     * Creates new message in a desired text channel and returns its id.
     *
     * **Note:** If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel for particular user.
     */
    async createMessage(channelId: string, content: MessageContent): Promise<string> {
        return new Promise(async (resolve) => {
            if (!channelId || !content) throw new Error('No channel id or content provided.')

            switch (typeof content) {
                case 'string': {
                    content = { content: content }
                    break
                }
                case 'number': {
                    if (Number.isFinite(content)) content = { content: content.toString() }
                    else content = { content: 'Infinite' }
                    break
                }
                case 'boolean': {
                    content = { content: content.toString() }
                    break
                }
            }

            const [data, err] = await this.restHandler.request('POST', `/channels/${channelId}/messages`, true, content)

            if (err) throw err
            else if (data.message && data.code) throw new RestAPIError(data.code, data.message)
            else resolve(data.id)
        })
    }
}
