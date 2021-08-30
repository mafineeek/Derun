import { RestAPIError } from '../Errors/RestAPIError'
import { sleep } from '../functions'
import { ClientEvents } from '../Typings/events'
import { ClientOptions } from '../Typings/options'
import { EventEmitter } from '../Util/EventEmitter'
import { RequestHandler } from '../Util/RequestHandler'
import { Shard } from './Shard'

/** Utility class that can hold a bunch of {@link Shard shards}. This core class connects all the caching, rest and gateway elements. */
export class ShardManager extends EventEmitter<ClientEvents> {
    /** @hideconstructor */
    constructor(token: string, options: ClientOptions = { shardCount: 'auto', intents: 1, connectionTimeout: 30000, largeThreshold: 50, requestTimeout: 15000, requestCleanInterval: 300000, restTimeOffset: 750, emitRawPayloads: false }) {
        super()

        if (!options.shardCount) options.shardCount = 'auto'
        else if (options.shardCount < 1) options.shardCount = 1

        if (!options.intents) options.intents = 1
        if (!options.connectionTimeout) options.connectionTimeout = 30000

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

    /** @hidden @protected */
    readonly token
    /**
     * Objects with all options used to control ShardManager & RestHandler.
     * @hidden @protected
     */
    readonly coreOptions
    protected readonly restHandler
    readonly shards = new Array<Shard>()
    #initialized = false
    #maxConcurrency = 1 // It will be used later if Derun will ever support big sharding (for bots with over 150k guilds).

    /** Tells all shards to connect. Your bot will be marked as working once last shard will connect to the network. Listen to "ready" event to acknowledge this moment. */
    protected async launch(): Promise<void> {
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
                    this.shards[id] = new Shard(this, id)

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
