import { GatewayErrorOptions } from '../Interfaces/Errors'

export default class GatewayError extends Error {
    constructor(options: GatewayErrorOptions) {
        super(`[Shard ${options.shardId}] [${options.code || 4000}] ${options.reason}`)
        this.name = 'GatewayError'

        Object.setPrototypeOf(this, new.target.prototype)
    }
}
