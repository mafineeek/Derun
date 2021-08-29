/**
 * You need to add specific catefoty to parse array to make it work. {@link https://discord.com/developers/docs/resources/channel#allowed-mentions-object See Discord Documentation.}
 *
 *  Assume you want to ping specific person and nobody else:
 * @example
 * ```ts
 * const mentions: AllowedMentionsOptions {
 *      parse: ['users'],
 *      users: ['390394829789593601']
 * }
 * ```
 */
export interface AllowedMentionsOptions {
    parse: 'everyone' | 'users' | 'roles'[]
    replied_user?: boolean
    users?: string[]
    roles?: string[]
}

export interface EmbedFieldOptions {
    inline?: boolean
    name: string
    value: string
}

/** Derun handles Embed Objects as they are. {@link https://discord.com/developers/docs/resources/channel#embed-object See Discord Documentation} for details. */
export interface EmbedOptions {
    author?: {
        icon_url?: string
        name: string
        url?: string
    }
    color?: number
    description?: string
    fields?: EmbedFieldOptions[]
    footer?: {
        icon_url?: string
        text: string
    }
    image?: {
        url?: string
    }
    thumbnail?: {
        url?: string
    }
    timestamp?: Date | string
    title?: string
    url?: string
}

export interface MessageReferenceReply {
    channel_id?: string
    guild_id?: string
    message_id?: string
    fail_if_not_exists?: boolean
}

export interface AdvancedMessageContent {
    allowed_mentions?: AllowedMentionsOptions
    content?: string
    embed?: EmbedOptions
    flags?: number
    message_reference?: MessageReferenceReply
    tts?: boolean
}

export type MessageContent = string | number | boolean | AdvancedMessageContent
