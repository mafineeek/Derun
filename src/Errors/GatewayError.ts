export interface GatewayErrorOptions {
    code?: number
    shardId: number
    reason: string
}

export class GatewayError extends Error {
    constructor(options: GatewayErrorOptions) {
        super(`[Shard ${options.shardId}] [${options.code || 4000}] ${options.reason}`)
        this.name = 'GatewayError'

        Object.setPrototypeOf(this, new.target.prototype)
    }
}
