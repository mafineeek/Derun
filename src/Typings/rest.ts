export type RequestMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH'

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
