import { User } from '..'
import { ActionRow, Embed } from './rest'

export type MessageContent = string | number | boolean | AdvancedMessageContent

/**
 * You need to add specific catefoty to parse array to make it work. {@link https://discord.com/developers/docs/resources/channel#allowed-mentions-object See Discord Documentation.}
 *
 *  Assume you want to ping specific person and nobody else:
 * @example
 * ```ts
 * const mentions: AllowedMentions {
 *      parse: ['users'],
 *      users: ['390394829789593601']
 * }
 * ```
 */
export interface AllowedMentions {
    parse: 'everyone' | 'users' | 'roles'[]
    replied_user?: boolean
    users?: string[]
    roles?: string[]
}

export interface MessageReference {
    channel_id?: string
    guild_id?: string
    message_id?: string
    fail_if_not_exists?: boolean
}

export interface AdvancedMessageContent {
    allowed_mentions?: AllowedMentions
    content?: string
    embeds?: Embed[]
    flags?: number
    message_reference?: MessageReference
    tts?: boolean
    components?: ActionRow[]
    sticker_ids?: string[]
}
