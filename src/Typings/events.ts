import { Payload } from './gateway'

export interface ClientEvents {
    /** Emitted when all shards finishes initialization process. It's basically a signal that bot is ready to work. */
    ready: () => void
    /** Emitted when shard successfully finished handshake with Discord Gateway. */
    shardReady: (shardId: number) => void
    /** Emitted after shard had problems with connection/session but successfully connected back. */
    shardResumed: (shardId: number) => void
    /** Emitted when shard run into not planned situation. */
    shardWarn: (shardId: number, reason: string) => void
    /** Emitted only in situations when something very important failed. Shard may not working correctly after this so it's recommended to respawn it. */
    shardError: (shardId: number, reason: string) => void
    /** Emitted when shard received unknown to him payload. Returned data will be in {@link Payload} form. Do whatever you want with it. */
    shardRawPayload: (shardId: number, data: Payload) => void
}
