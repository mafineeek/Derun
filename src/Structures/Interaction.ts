import { Client } from '../Client'
import { InteractionType } from '../constants'
import { SlashCommand } from '../Typings/command'
import { ResolvedMember } from './ResolvedMember'
import { User } from './User'

export class Interaction {
    /** @hideconstructor @hidden @private */
    constructor(raw: any, client: Client) {
        if (!raw || !raw.id || !raw.token || !raw.channel_id || (!raw.member && !raw.user) || !raw.data) throw new TypeError('Invalid params. Failed to construct new Interaction instance.')

        this.id = raw.id
        this.token = raw.token
        this.channelId = raw.channel_id
        this.guildId = raw.guild_id
        this.type = raw.type
        this.version = raw.version

        if (this.guildId) this.member = new ResolvedMember(raw.member)
        else this.user = new User(raw.user)

        if (this.type === InteractionType.APPLICATION_COMMAND) this.command = client.findCommand(raw.data?.name)
    }

    readonly id: string
    readonly token: string
    readonly channelId: string
    readonly guildId?: string
    /** It will be defined only if interaction was created in guild channel. In DM channels you'll receive {@link Interaction#user} object in place of {@link Interaction#member}. */
    readonly member?: ResolvedMember
    readonly user?: User
    readonly invokedAt = Date.now()
    readonly command?: SlashCommand
    readonly type: InteractionType
    readonly version: number

    /** Whether the interaction has expired. Interactions last 15 minutes. */
    get expired() {
        return this.invokedAt + 1000 * 60 * 15 < Date.now()
    }
}
