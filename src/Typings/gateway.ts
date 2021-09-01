import { ActivityType } from '../constants'

export type Activity = {
    status: 'online' | 'idle' | 'dnd' | 'invisible'
    name?: string
    type?: keyof typeof ActivityType
    url?: string
}

/** General schema for Discord Payloads. Your custom payloads needs to follow this schema. */
export interface Payload {
    op: number
    /** It may be a boolean, number or any mixed JSON structure. */
    d?: any
    s?: number
    t?: string
}

export interface HeartbeatOptions {
    interval?: number
    timer?: NodeJS.Timeout
    ack: boolean
    lastHeartbeat?: number
}
