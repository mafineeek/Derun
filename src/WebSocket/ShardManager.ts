import { sleep } from '../functions'
import { ShardManagerEvents } from '../Interfaces/Events'
import { ShardManagerOptions } from '../Interfaces/Options'
import { EventEmitter } from '../Util/EventEmitter'
import Shard from './Shard'

export default class ShardManager extends EventEmitter<ShardManagerEvents> {
    constructor(token: string, { shardCount = 'auto', intents = 1 }: ShardManagerOptions) {
        super()

        this._token = token
        this._shardCount = shardCount
        this._intents = intents
    }

    private readonly _token
    private readonly _shardCount
    private readonly _intents
    private readonly _shards = new Array<Shard>()

    public get token() {
        return this._token
    }

    public get shardCount() {
        return this._shardCount
    }

    public get intents() {
        return this._intents
    }

    public async summon() {
        const createShard = async (id: number): Promise<void> => {
            return new Promise(async (resolve) => {
                this._shards[id] = new Shard(this, id)

                this.once('shardReady', (shardId) => {
                    if (shardId === id) return resolve()
                    else throw new Error('Failed to launch shards in order! Check your internet connection and try again.')
                })
            })
        }

        for (let i = 0; i < this._shardCount; i++) {
            await createShard(i)
            await sleep(5000) // Extra 5s just in case..
        }
    }
}
