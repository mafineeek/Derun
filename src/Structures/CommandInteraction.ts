import { Client } from '../Client'
import { InteractionCallbackType } from '../constants'
import { RestAPIError } from '../Errors/RestAPIError'
import { MessageContent } from '../Typings/message'
import { Interaction } from './Interaction'

export class CommandInteraction extends Interaction {
    /** @hideconstructor @hidden @private */
    constructor(raw: any, client: Client) {
        super(raw)

        if (!raw.data.name || !client) throw new TypeError('Invalid params. Failed to construct new Command Interaction instance.')

        this.command = client.findCommand(raw.data.name)
        this.client = client

        for (const option of raw.data?.options ?? []) this.options[option.name] = option?.value
    }

    readonly command
    readonly options: { [key: string]: string | number } = {}
    readonly client

    /**
     * Acknowledges the interaction with a message.
     * You should create followup message if you have already responded with a different interaction response.
     * Set second param to `true` to make message ephermal *(visible only for replied member)*.
     */
    async sendReply(content: MessageContent, ephemeral?: boolean) {
        if (!content) throw new TypeError('No content provided.')
        if (this.acknowledged) throw new Error('You have already acknowledged this interaction.')
        if (this.invalid) throw new Error("This interaction has been invalided cause you didn't replied within 3 seconds.")

        if (typeof content !== 'object') content = { content: `${content}` }
        if (!content.content) throw new TypeError('No content provided.')
        if (!content.flags && ephemeral) content.flags = 64

        const [data, err] = await this.client.restHandler.request('POST', `/interactions/${this.id}/${this.token}/callback`, true, {
            type: InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: content
        })

        if (err) throw err
        else if (data && data.code && data.message) throw new RestAPIError(data.code, data.message)
        this.acknowledged = true
    }

    async editReply(content: MessageContent, ephemeral?: boolean) {
        if (!content) throw new TypeError('No content provided.')
        if (!this.acknowledged) throw new Error('You have to first acknowledge interaction to edit it.')
        if (this.expired) throw new Error('This interaction has expired. Interaction token remain valid only for first 15 minutes after being created.')

        if (typeof content !== 'object') content = { content: `${content}` }
        if (!content.content) throw new TypeError('No content provided.')
        if (!content.flags && ephemeral) content.flags = 64

        const [data, err] = await this.client.restHandler.request('PATCH', `/webhooks/${this.applicationId}/${this.token}/messages/@original`, true, content)

        if (err) throw err
        else if (data && data.code && data.message) throw new RestAPIError(data.code, data.message)
    }

    async deleteReply() {
        if (!this.acknowledged) throw new Error('You have to first acknowledge interaction to delete it.')
        if (this.expired) throw new Error('This interaction has expired. Interaction token remain valid only for first 15 minutes after being created.')

        const [data, err] = await this.client.restHandler.request('DELETE', `/webhooks/${this.applicationId}/${this.token}/messages/@original`, true)

        if (err) throw err
        else if (data && data.code && data.message) throw new RestAPIError(data.code, data.message)
    }

    /**
     * Sends message without acknowledging callback. You have to defer or send reply first to acknowledge callback.
     * Set second param to `true` to make message ephermal *(visible only for replied member)*.
     */
    async sendFollowUp(content: MessageContent, ephemeral?: boolean) {
        if (!content) throw new TypeError('No content provided.')
        if (!this.acknowledged) throw new Error('Follow Up message cannot be used to acknowledge an interaction, please use reply to it or defer first.')
        if (this.expired) throw new Error('This interaction has expired. Interaction token remain valid only for first 15 minutes after being created.')

        if (typeof content !== 'object') content = { content: `${content}` }
        if (!content.content) throw new TypeError('No content provided.')
        if (!content.flags && ephemeral) content.flags = 64

        const [data, err] = await this.client.restHandler.request('POST', `/webhooks/${this.applicationId}/${this.token}`, true, { ...content, wait: true })

        if (err) throw err
        else if (data && data.code && data.message) throw new RestAPIError(data.code, data.message)
    }

    /**
     * Acknowledges the interaction with a defer response.
     * Note: You can **not** use more than 1 initial interaction response per interaction.
     *
     * Bot will reply with **"Bot is thinking"** placeholder and will wait for you to update their status.
     * Interaction life time is 15 minutes, after it message will automatically error and your interaction token will no longer be valid.
     * Set second param to `true` to make message ephermal *(visible only for replied member)*.
     */
    async defer(ephemeral?: boolean) {
        if (this.acknowledged) throw new Error('You have already acknowledged this interaction.')
        if (this.invalid) throw new Error("This interaction has been invalided cause you didn't replied within 3 seconds.")

        const [data, err] = await this.client.restHandler.request('POST', `/interactions/${this.id}/${this.token}/callback`, true, {
            type: InteractionCallbackType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
            data: { flags: ephemeral ? 64 : 0 }
        })

        if (err) throw err
        else if (data && data.code && data.message) throw new RestAPIError(data.code, data.message)
        this.acknowledged = true
    }
}
