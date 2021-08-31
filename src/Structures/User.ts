import { UserFlags } from '../BitFields/UserFlags'
import { CDNEndpoint } from '../constants'

export class User {
    /** @hideconstructor @hidden @private */
    constructor(raw: any) {
        if (!raw || !raw.id || !raw.username || !raw.discriminator) throw new TypeError('Invalid params. Failed to construct new User instance.')

        this.id = raw.id
        this.username = raw.username
        this.badges = new UserFlags(raw.public_flags ?? 0).toArray()
        this.discriminator = raw.discriminator
        this.#avatarHash = raw.avatar
        this.botAccount = raw.bot ?? false
    }

    readonly id: string
    readonly username: string
    readonly badges
    readonly discriminator: string
    readonly #avatarHash?: string
    readonly botAccount: boolean

    get avatarURL(): string {
        return this.#avatarHash ? CDNEndpoint.Avatar(this.id, this.#avatarHash) : CDNEndpoint.DefaultAvatar((Number(this.discriminator) % 5).toString())
    }

    get mention() {
        return `<@${this.id}>`
    }

    get tag() {
        return `${this.username}#${this.discriminator}`
    }

    dynamicAvatarURL(format: 'png' | 'jpg' | 'gif', size: 32 | 64 | 128 | 256 | 512 | 1024) {
        return `${this.avatarURL}.${format}?size=${size}`
    }
}
