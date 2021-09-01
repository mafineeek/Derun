import { Client } from '../Client'
import { InteractionCallbackType } from '../constants'
import { RestAPIError } from '../Errors/RestAPIError'
import { MessageContent } from '../Typings/message'
import { Interaction } from './Interaction'

export class CommandInteraction extends Interaction {
    constructor(raw: any, client: Client) {
        super(raw)

        if (!raw.data.name || !client) throw new TypeError('Invalid params. Failed to construct new Command Interaction instance.')

        this.command = client.findCommand(raw.data.name)
        this.#client = client

        for (const option of raw.data?.options ?? []) this.options[option.name] = option?.value
    }

    readonly command
    readonly options: { [key: string]: string | number } = {}
    readonly #client

    async reply(content: MessageContent) {
        if (!content) throw new Error('No content provided.')
        if (this.invalid) throw new Error("This interaction has been invalided cause you didn't replied within 3 seconds.")

        switch (typeof content) {
            case 'string': {
                content = { content: content }
                break
            }
            case 'boolean':
            case 'number': {
                content = { content: String(content) }
                break
            }
        }

        const [data, err] = await this.#client.restHandler.request('POST', `/interactions/${this.id}1/${this.token}/callback`, true, {
            type: InteractionCallbackType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: content
        })

        if (err) throw err
        else if (data && data.code && data.message) throw new RestAPIError(data.code, data.message)

        this.acknowledged = true
    }
}
