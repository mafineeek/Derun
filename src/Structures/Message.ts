import { MessageContent } from '..'
import { Client } from '../Client'
import { RestAPIError } from '../Errors/RestAPIError'

// It doesn't contain core fields like content or embeds because they won't be available from 2022 so we want to already get prepared.
export class Message {
    /** @hideconstructor @hidden @private */
    constructor(raw: any, client: Client) {
        if (!raw || !raw.id || !raw.channel_id || !raw.timestamp || !client) throw new TypeError('Invalid params. Failed to construct new Message instance.')

        this.id = raw.id
        this.channelId = raw.channel_id
        if (raw.timestamp) this.createdAt = Date.parse(raw.timestamp) ?? Date.now()
        this.flags = raw.flags ?? 0
        this.#client = client
    }

    readonly id: string
    readonly channelId: string
    readonly createdAt: number
    readonly flags: number
    readonly #client
    editedAt?: number

    /** In Derun, only bot can send message so obviously **Message#author** will be always pointing to bot user. */
    get author() {
        return this.#client.user
    }

    async edit(content: MessageContent) {
        if (!content) throw new TypeError('No content provided.')

        if (typeof content !== 'object') content = { content: `${content}` }
        if (!content.content) throw new TypeError('No content provided.')

        const [data, err] = await this.#client.restHandler.request('PATCH', `/channels/${this.channelId}/messages/${this.id}`, true, content)

        if (err) throw err
        else if (data && data.code && data.message) throw new RestAPIError(data.code, data.message)

        if (data.edited_timestamp) this.editedAt = Date.parse(data.edited_timestamp) ?? Date.now()
    }

    async delete() {
        await this.#client.deleteMessage(this.channelId, this.id)
    }

    async crosspost() {
        await this.#client.crosspostMessage(this.channelId, this.id)
    }
}
