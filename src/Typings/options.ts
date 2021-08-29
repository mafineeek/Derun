export interface ClientOptions {
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

    /**
     * A number of milliseconds to offset the ratelimit timing calculations by. If your connection is unstable or your ping is quite high - you can set higher value to avoid hitting rate limit issues caused by time offset between your VPS and Discord Gateway times.
     * @default 750
     */
    restTimeOffset: number
}

export interface ErrorOptionsBase {
    code?: number
    reason: string
}

export interface GatewayErrorOptions extends ErrorOptionsBase {
    shardId: number
}

export interface EventListenerOptions<T> {
    once?: boolean
    callback: T[keyof T]
}
