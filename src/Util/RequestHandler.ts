// import { Endpoint } from "../types.ts";
// import ShardManager from "../WebSocket/ShardManager.ts";

// /** Utility structure to make requests to discord rest API more easily. */
// export default class RequestHandler {
//     constructor(manager: ShardManager) {
//         this.manager = manager
//     }

//     private readonly manager
//     private readonly userAgent = 'DiscordBot https://github.com/Amatsagu/Derun'
//     private readonly domain = 'discord.com'
//     private readonly requestTimeout = 15000

//     public async request(method: requestMethod, url: string, requireAuthentication: boolean, content?: Object): Promise<[any, string]> {
//         try {
//             const options: OptionsOfTextResponseBody = {
//                 method: method,
//                 host: this.domain,
//                 headers: {
//                     'User-Agent': this.userAgent,
//                     'Content-Type': `application/json`
//                 },
//                 body: content ? JSON.stringify(content) : null,
//                 timeout: this.requestTimeout
//             }

//             if (url.startsWith('/')) url = ENDPOINT.API + url
//             if (requireAuthentication) options.headers['Authorization'] = `Bot ${this.manager.token}`
//             if (!content) delete options.body

//             const { body } = await got(url, options)

//             return [JSON.parse(body as unknown as string), null]
//         } catch (err) {
//             return [null, format(err)]
//         }
//     }

//     private toString() {
//         return '[RequestHandler]'
//     }

//     private toJSON() {
//         return {
//             userAgent: this.userAgent,
//             domain: this.domain,
//             apiEndpoint: Endpoint.REST,
//             requestTimeout: this.requestTimeout
//         }
//     }
// }
