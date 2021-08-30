import { Endpoint } from '../constants'
import { sleep } from '../functions'
import { GlobalRateLimits, RateLimitBucket, RequestMethod } from '../Typings/rest'
import { ShardManager } from '../WebSocket/ShardManager'
import centra from 'centra'

/** Fully automated class to deal with rest calls. It makes HTTP requests to Discord API as easy as possible. Automatically handling global & local rate limits. */
export class RequestHandler {
    /** @hideconstructor @hidden */
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
            const headers: { [key: string]: string } = {
                'User-Agent': this.#userAgent,
                'Content-Type': `application/json`,
                Authorization: `Bot ${this.#manager.token}`
            }

            if (!requireAuthentication) delete headers['Authorization']

            await this.#syncGlobalRateLimits()

            const bucket = this.#rateLimits.get(route)
            let cdr = 0

            if (bucket) {
                if (bucket.remaining === 0) cdr = bucket.resetAt - Date.now() + this.#manager.coreOptions.restTimeOffset
                else bucket.remaining--
            }

            setTimeout(async () => {
                await centra(Endpoint.REST + route, method)
                    .timeout(this.#manager.coreOptions.requestTimeout)
                    .header(headers)
                    .body(content, 'json')
                    .send()
                    .then((res) => {
                        const headers = res.headers as unknown as { [key: string]: string }

                        if (headers['x-ratelimit-limit']) {
                            const total = parseInt(headers['x-ratelimit-limit'])
                            const remaining = parseInt(headers['x-ratelimit-remaining'])
                            const resetAt = Date.now() + parseInt(headers['x-ratelimit-reset-after']) * 1000

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
}
