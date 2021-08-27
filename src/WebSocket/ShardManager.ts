import { ShardError } from '../constants'
import { GatewayError } from '../Errors/GatewayError'
import { sleep } from '../functions'
import { EventEmitter } from '../Util/EventEmitter'
import { RequestHandler } from '../Util/RequestHandler'
import { Payload, Shard } from './Shard'

export interface ShardManagerEvents {
    /** Emitted when all shards finishes initialization process. It's basically a signal that bot is ready to work. */
    ready: () => any
    /** Emitted when shard successfully finished handshake with Discord Gateway. */
    shardReady: (shardId: number) => any
    /** Emitted after shard had problems with connection/session but successfully connected back. */
    shardResumed: (shardId: number) => any
    /** Emitted when shard run into not planned situation. */
    shardWarn: (shardId: number, reason: string) => any
    /** Emitted only in situations when something very important failed. Shard may not working correctly after this so it's recommended to respawn it. */
    shardError: (shardId: number, reason: string) => any
    /** Emitted when shard received unknown to him payload. Returned data will be in {@link Payload} form. Do whatever you want with it. */
    shardRawPayload: (shardId: number, data: Payload) => any
}

export interface ShardManagerOptions {
    /**
     * Total number of shards you want to launch. Set to "auto" to let Derun lib fetch it automatically.
     * @default 'auto'
     * */
    shardCount: number | 'auto'
    /**
     * Gateway Intents are a system to help you lower that computational burden.
     * Head to [this handy calculator](https://ziad87.net/intents/) and select events you are interested in.
     * @default 1
     */
    intents: number
    /**
     * How long *(in milliseconds)* Shard should wait for establishing connection with Discord Gateway. It will throw GatewayError on timeout.
     * @default 30000
     * */
    connectionTimeout: number
    /**
     * The maximum number of offline users per guild during initial guild data transmission. *(between 50 and 250)*
     * @default 50
     * */
    largeThreshold: number

    /**
     * How long *(in milliseconds)* should rest handler wait for HTTP request to resolve.
     * @default 15000
     * */
    requestTimeout: number

    /**
     * How commonly *(in milliseconds)* should rest handler sweep cache from finished requests. Setting this value to low may result using more CPU cause of constantly "mark & sweep" loops.
     * @default 300000
     * */
    requestCleanInterval: number
}

/** Utility class that can hold a bunch of {@link Shard shards}. This core class connects all the caching, rest and gateway elements. */
export class ShardManager extends EventEmitter<ShardManagerEvents> {
    /**
     * 🚧 **You should never construct this class on your own!**
     * @private
     */
    constructor(token: string, options: ShardManagerOptions = { shardCount: 'auto', intents: 1, connectionTimeout: 30000, largeThreshold: 50, requestTimeout: 15000, requestCleanInterval: 300000 }) {
        super()

        if (!options.shardCount) options.shardCount = 'auto'
        else if (options.shardCount < 1) options.shardCount = 1

        if (!options.intents) options.intents = 1
        if (!options.connectionTimeout) options.connectionTimeout = 30000

        if (!options.largeThreshold) options.largeThreshold = 50
        else if (options.largeThreshold > 250) options.largeThreshold = 250
        else if (options.largeThreshold < 50) options.largeThreshold = 50

        if (!options.requestTimeout) options.requestTimeout = 15000
        else if (options.requestTimeout < 15000) options.requestTimeout = 10000 // Not less than 10s.

        if (!options.requestCleanInterval) options.requestCleanInterval = 300000
        else if (options.requestCleanInterval < 30000) options.requestCleanInterval = 30000 // Not less than 30s.

        this.token = token
        this.coreOptions = options
        this.restHandler = new RequestHandler(this)
    }

    /** @private */
    readonly token
    /** @private */
    readonly coreOptions
    /** @readonly */
    readonly shards = new Array<Shard>()
    /** @readonly */
    readonly restHandler
    #initialized = false
    #maxConcurrency = 1 // It will be used later if Derun will ever support big sharding (for bots with over 150k guilds).

    /**
     * 🚧 **You should never run this method on your own!**
     * @private
     */
    public async init() {
        if (this.#initialized) return
        this.#initialized = true

        // It should never throw any error, so I'm gonna ignore it for now.
        const [data, err] = await this.restHandler.request('GET', '/gateway/bot', true)

        if (this.coreOptions.shardCount === 'auto') this.coreOptions.shardCount = data.shards ?? 1
        if (data.session_start_limit.remaining < this.coreOptions.shardCount) throw new GatewayError({ shardId: -1, code: ShardError.RATE_LIMITED, reason: `This token was used to launch over ${data.session_start_limit.times} sessions. Discord decided to block it for another ${(data.session_start_limit.reset_after / 1000 / 60).toFixed(1)} minute(s).` })

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
    }
}
