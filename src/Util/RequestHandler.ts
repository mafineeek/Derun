import fetch, { RequestInit } from 'node-fetch'
import { Endpoint } from '../constants'
import { sleep } from '../functions'
import { GlobalRateLimits, RateLimitBucket, RequestMethod } from '../Typings/rest'
import { ShardManager } from '../WebSocket/ShardManager'

/** Fully automated class to deal with rest calls. It makes HTTP requests to Discord API as easy as possible. Automatically handling global & local rate limits. */
export class RequestHandler {
    /**
     * 🚧 **You should never construct this class on your own!**
     * @private
     */
    constructor(manager: ShardManager) {
        this.#manager = manager
        this.#clean()
    }

    readonly #manager
    readonly #userAgent = 'DiscordBot https://github.com/Amatsagu/Derun'
    readonly #domain = 'discord.com'
    #globalRateLimits: GlobalRateLimits = {
        perSecond: 50,
        perSecondLastUpdate: Date.now(),
        per10Minutes: 10000,
        per10MinutesLastUpdate: Date.now()
    }
    #rateLimits = new Map<string, RateLimitBucket>()

    /**
     * Makes desired HTTP request to Discord Rest API. Remember to handle errors by yourself, it will return array with output on first place *(0)* and potential error on second slot *(1)*.
     * Second slot will be null if request was successfull and there's no errors. First slot will be null if there was any error catched.
     * @example
     * ```ts
     * const [result, error] = await restHandler.request('GET', '/gateway/bot', true)
     * ```
     */
    public async request(method: RequestMethod, route: string, requireAuthentication: boolean, content?: Object): Promise<[any, any]> {
        return new Promise(async (resolve) => {
            const options: RequestInit = {
                method: method,
                headers: {
                    'User-Agent': this.#userAgent,
                    'Content-Type': `application/json`
                },
                timeout: this.#manager.coreOptions.requestTimeout
            }

            // @ts-ignore
            if (requireAuthentication) options.headers['Authorization'] = `Bot ${this.#manager.token}`
            if (content) options.body = JSON.stringify(content)

            await this.#syncGlobalRateLimits()

            const bucket = this.#rateLimits.get(route)
            let cdr = 0

            if (bucket) {
                if (bucket.remaining === 0) cdr = bucket.resetAt - Date.now() + this.#manager.coreOptions.restTimeOffset
                else bucket.remaining--
            }

            setTimeout(async () => {
                await fetch(Endpoint.REST + route, options)
                    .then((res) => {
                        if (res.headers.has('x-ratelimit-limit')) {
                            const total = parseInt(res.headers.get('x-ratelimit-limit'))
                            const remaining = parseInt(res.headers.get('x-ratelimit-remaining'))
                            const resetAt = Date.now() + parseInt(res.headers.get('x-ratelimit-reset-after')) * 1000

                            this.#rateLimits.set(route, { total, remaining, resetAt })
                        }

                        return res.json()
                    })
                    .then((data) => resolve([data, null]))
                    .catch((err) => resolve([null, err]))
            }, cdr)
        })
    }

    #clean() {
        const now = Date.now()

        if (this.#rateLimits.size !== 0) {
            for (const [route, bucket] of this.#rateLimits.entries()) {
                if (now > bucket.resetAt + this.#manager.coreOptions.requestCleanInterval) this.#rateLimits.delete(route)
            }
        }

        setTimeout(() => this.#clean(), this.#manager.coreOptions.requestCleanInterval)
    }

    async #syncGlobalRateLimits(): Promise<void> {
        return new Promise(async (resolve) => {
            const now = Date.now()

            if (this.#globalRateLimits.perSecond <= 0) {
                let remaining = this.#globalRateLimits.perSecondLastUpdate + 1000 - now

                if (remaining > 0) await sleep(remaining + this.#manager.coreOptions.restTimeOffset)
                else remaining = 0

                this.#globalRateLimits.perSecond = 50
                this.#globalRateLimits.perSecondLastUpdate = now + remaining
            } else this.#globalRateLimits.perSecond--

            if (this.#globalRateLimits.per10Minutes <= 0) {
                let remaining = this.#globalRateLimits.per10MinutesLastUpdate + 600000 - now

                if (remaining > 0) await sleep(remaining + this.#manager.coreOptions.restTimeOffset)
                else remaining = 0

                this.#globalRateLimits.per10Minutes = 10000
                this.#globalRateLimits.per10MinutesLastUpdate = now + remaining
            } else this.#globalRateLimits.per10Minutes--

            resolve()
        })
    }

    #toString() {
        return '[RequestHandler]'
    }

    #toJSON() {
        return {
            userAgent: this.#userAgent,
            domain: this.#domain,
            apiEndpoint: Endpoint.REST,
            requestTimeout: this.#manager.coreOptions.requestTimeout,
            requestCleanInterval: this.#manager.coreOptions.requestCleanInterval,
            globalRatelimits: this.#globalRateLimits
        }
    }
}
