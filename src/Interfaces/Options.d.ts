export interface ShardManagerOptions {
    shardCount: number | 'auto'
    intents: number
}

export interface HeartbeatOptions {
    interval: number
    timer: NodeJS.Timeout
    ack: boolean
    ping: number
    lastHeartbeat: number
}
