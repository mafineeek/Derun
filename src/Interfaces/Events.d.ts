import { GeneralPayload } from './Payloads'

export interface GatewayWSEvents {
    /** Emitted after ws instance successfully connected with Discord Gateway. (emitted only once) */
    ready: () => any
    /** Emitted when ws instance successfully destroy "zombified" connection and open new connection to Discord Gateway. */
    resumed: () => any
    /** Emitted after ws instance got "zombified" or when endpoint refused longer connection. */
    lost: () => any
    /** Emitted on each message received from endpoint ws instance connected to. It returns data in {@link GeneralPayload} form. */
    payload: (data: GeneralPayload) => any
    /** Emitted after ws instance tried to resume lost connection but failed. */
    dead: (reason: string) => any
    /** Emitted when connection has been terminated by localhost (safe). */
    closed: () => any
}

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
    /** Emitted when shard received unknown to him payload. Returned data will be in {@link GeneralPayload} form. Do whatever you want with it. */
    shardRawPayload: (shardId: number, data: GeneralPayload) => any
}
