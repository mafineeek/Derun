import { Permission } from '../BitFields/Permission'
import { User } from './User'

export class ResolvedMember extends User {
    /** @hideconstructor @hidden @private */
    constructor(raw: any) {
        super(raw.user ?? raw)

        this.nick = raw?.nick
        this.joinedAt = Date.parse(raw.joined_at ?? 0)
        this.premiumSince = raw.premium_since
        this.roleIds = raw.roles ?? []
        this.permissions = new Permission(BigInt(raw.permissions ?? 0))
        this.pendingVerification = raw.pending ?? false
    }

    /** Custom name set on specific server. */
    readonly nick?: string
    readonly joinedAt
    /** The time of when this member boosted the server. */
    readonly premiumSince?: number
    readonly roleIds: string[]
    readonly permissions
    readonly pendingVerification
}
