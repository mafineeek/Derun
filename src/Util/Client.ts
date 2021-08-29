import { MessageContent } from '../Typings/message'
import { ClientOptions } from '../Typings/options'
import { Message } from '../Structures/Message'
import { ShardManager } from '../WebSocket/ShardManager'
import { RestAPIError } from '../Errors/RestAPIError'

export class Client extends ShardManager {
    constructor(token: string, options: ClientOptions) {
        super(token, options)
    }

    /**
     * Creates new message in a desired text channel.
     *
     * **Note:** If you want to DM someone, the user ID is **not** the DM channel ID. use Client.getDMChannel() to get the DM channel for particular user.
     */
    async createMessage(channelId: string, content: MessageContent): Promise<Message> {
        return new Promise(async (resolve) => {
            if (!channelId || !content) throw new Error('No channel id or content provided.')

            switch (typeof content) {
                case 'string': {
                    content = { content: content }
                    break
                }
                case 'number': {
                    if (Number.isFinite(content)) content = { content: content.toString() }
                    else content = { content: 'Infinite' }
                    break
                }
                case 'boolean': {
                    content = { content: content.toString() }
                    break
                }
            }

            const [data, err] = await this.restHandler.request('POST', `/channels/${channelId}/messages`, true, content)

            if (err) throw err
            else if (data.message && data.code) throw new RestAPIError(data.code, data.message)
            else resolve(data)
        })
    }
}
