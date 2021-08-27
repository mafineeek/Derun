import { sleep } from '../functions'
import { EventEmitter } from '../Util/EventEmitter'
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
    /** Total number of shards you want to launch. Set to "auto" to let Derun lib fetch it automatically. */
    shardCount: number | 'auto'
    /** Gateway Intents are a system to help you lower that computational burden.
     *  Head to [this handy calculator](https://ziad87.net/intents/) and select events you are interested in.
     */
    intents: number
    /** How long *(in milliseconds)* Shard should wait for establishing connection with Discord Gateway. It will throw GatewayError on timeout. */
    connectionTimeout: number
    /** The maximum number of offline users per guild during initial guild data transmission. *(between 50 and 250)* */
    largeThreshold: number
}

export class ShardManager extends EventEmitter<ShardManagerEvents> {
    constructor(token: string, options: ShardManagerOptions = { shardCount: 'auto', intents: 1, connectionTimeout: 30000, largeThreshold: 50 }) {
        super()

        if (!options.shardCount) options.shardCount = 'auto'
        if (!options.intents) options.intents = 1
        if (!options.connectionTimeout) options.connectionTimeout = 30000

        if (!options.largeThreshold) options.largeThreshold = 50
        else if (options.largeThreshold > 250) options.largeThreshold = 250
        else if (options.largeThreshold < 50) options.largeThreshold = 50

        this.token = token
        this.shardOptions = options
    }

    readonly token
    readonly shardOptions
    readonly shards = new Array<Shard>()
    #initialized = false

    public async init() {
        if (this.#initialized) return
        this.#initialized = true

        const createShard = async (id: number): Promise<void> => {
            return new Promise(async (resolve) => {
                this.shards[id] = new Shard(this, id)

                this.once('shardReady', async (shardId) => {
                    if (shardId === id) {
                        if (shardId + 1 === this.shardOptions.shardCount) this.emit('ready')
                        await sleep(5000)
                        return resolve()
                    } else throw new Error('Failed to launch shards in order! Check your internet connection and try again.')
                })
            })
        }

        for (let i = 0; i < this.shardOptions.shardCount; i++) await createShard(i)
    }
}
