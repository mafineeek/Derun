import { ButtonStyle, ComponentType, InteractionCommandType, InteractionType, SlashCommandType } from '../constants'

export type RequestMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'
export type ActionRowComponents = Button | SelectMenu

export interface GlobalRateLimits {
    perSecond: number
    perSecondLastUpdate: number
    per10Minutes: number
    per10MinutesLastUpdate: number
}

export interface RateLimitBucket {
    remaining: number
    total: number
    resetAt: number
}

export interface PartialEmojiObject {
    id: string | null
    name: string
    animated?: boolean
}

export interface Button {
    disabled?: boolean
    emoji?: PartialEmojiObject
    label?: string
    type: ComponentType.BUTTON
    style: ButtonStyle
    /** Set your own, unique string that you will catch later in code. */
    custom_id?: string
    /** Set Button#style to 5 (LINK) if you want to point to specific URL. */
    url?: string
}

export interface SelectMenu {
    custom_id: string
    disabled?: boolean
    max_values?: number
    min_values?: number
    options: SelectMenuOptions[]
    placeholder?: string
    type: ComponentType.SELECT_MENU
}

export interface SelectMenuOptions {
    default?: boolean
    description?: string
    emoji?: PartialEmojiObject
    label: string
    value: string
}

export interface ActionRow {
    components: ActionRowComponents[]
    type: ComponentType.ACTION_ROW
}

export interface EmbedField {
    inline?: boolean
    name: string
    value: string
}

/** Derun handles Embed Objects as they are. {@link https://discord.com/developers/docs/resources/channel#embed-object See Discord Documentation} for details. */
export interface Embed {
    author?: {
        icon_url?: string
        name: string
        url?: string
    }
    color?: number
    description?: string
    fields?: EmbedField[]
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
