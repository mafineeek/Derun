import { GeneralPayload } from './Payloads'

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
