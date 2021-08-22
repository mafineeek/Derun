import { OPCode } from '../constants'

export interface GeneralPayload {
    op: OPCode
    d?: any
    s?: number
    t?: string
}

export interface IdentityPayload extends GeneralPayload {
    op: OPCode // OPCode.IDENTIFY
    d: {
        token: string
        shard?: number[]
        intents: number
        large_threshold: number
        properties: {
            $os: string
            $browser: string
            $device: string
        }
    }
}

export interface ResumePayload extends GeneralPayload {
    op: OPCode // OPCode.RESUME
    d: {
        token: string
        session_id: string
        seq: number | null
    }
}
