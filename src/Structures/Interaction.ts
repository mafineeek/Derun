import { Client } from '../Client'
import { InteractionType } from '../constants'
import { SlashCommand } from '../Typings/command'
import { ResolvedMember } from './ResolvedMember'
import { User } from './User'

export class Interaction {
    /** @hideconstructor @hidden @private */
    constructor(raw: any) {
        if (!raw || !raw.id || !raw.application_id || !raw.token || !raw.channel_id || (!raw.member && !raw.user) || !raw.data) throw new TypeError('Invalid params. Failed to construct new Interaction instance.')

        this.id = raw.id
        this.applicationId = raw.application_id
        this.token = raw.token
        this.channelId = raw.channel_id
        this.guildId = raw.guild_id
        this.type = raw.type
        this.version = raw.version

        if (this.guildId) this.member = new ResolvedMember(raw.member)
        else this.user = new User(raw.user)
    }

    readonly id: string
    readonly applicationId: string
    readonly token: string
    readonly channelId: string
    readonly guildId?: string
    /** It will be defined only if interaction was created in guild channel. In DM channels you'll receive {@link Interaction#user} object in place of {@link Interaction#member}. */
    readonly member?: ResolvedMember
    readonly user?: User
    readonly receivedAt = Date.now()
    readonly type: InteractionType
    readonly version: number
    acknowledged = false

    /** Interactions are active only 3 seconds after you received them. You can defer interaction reply and then reply before token expires (15 min). */
    get invalid() {
        return !this.acknowledged && this.receivedAt + 3000 < Date.now()
    }

    /** Whether the interaction has expired. Interactions last 15 minutes. */
    get expired() {
        return this.receivedAt + 900000 < Date.now()
    }
}
