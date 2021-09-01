import WebSocket from 'ws'
import { Endpoint, InteractionType, OPCode, ShardError, ShardStatus } from '../constants'
import { GatewayError } from '../Errors/GatewayError'
import { sleep } from '../functions'
import { HeartbeatOptions, Payload } from '../Typings/gateway'
import { Client } from '../Client'
import { User } from '../Structures/User'
import { Interaction } from '../Structures/Interaction'
import { CommandInteraction } from '../Structures/CommandInteraction'

/** Fully automated class that creates connection with Discord Gateway and keeps it alive. */
export class Shard {
    /** @hideconstructor @hidden @private */
    constructor(client: Client, id: number) {
        this.#client = client
        this.#expose = client.coreOptions.emitRawPayloads
        this.id = id
        this.#resetWS(true, false)
    }

    readonly #client
    readonly #expose
    readonly id
    readonly createdAt = Date.now()

    /**
     * Latency in milliseconds.
     * @readonly
     * */
    ping!: number
    /** @readonly */
    status: ShardStatus = ShardStatus.UNAVAILABLE

    #ws!: WebSocket
    #resetTimer?: NodeJS.Timeout
    #heartbeat: HeartbeatOptions = {
        interval: null,
        timer: null,
        ack: false,
        lastHeartbeat: null
    }
    #lastSequence?: number
    #sessionId?: string

    /** Sends your payload into discord gateway. It will throw potential error. */
    public send(payload: Payload) {
        if (this.status < ShardStatus.HANDSHAKING) return

        try {
            this.#ws.send(JSON.stringify(payload))
        } catch {
            throw new GatewayError(this.id, ShardError.DECODE_ERROR, 'Failed to stringify payload. It may hold invalid data')
        }
    }

    async #resetWS(restart: boolean, resume: boolean): Promise<void> {
        return new Promise(async (resolve) => {
            this.status = ShardStatus.UNAVAILABLE

            if (this.#ws) {
                this.#ws.removeAllListeners()
                this.#ws.onopen = this.#ws.onclose = this.#ws.onerror = this.#ws.onmessage = null

                try {
                    this.#ws.close(4000)
                } catch {
                    /** Do Nothing. */
                }

                this.#ws = null
                await sleep(Math.floor(Math.random() * 5000) + 2000) // 2~5s
            }

            clearTimeout(this.#heartbeat.timer)
            this.#heartbeat.interval = null
            this.#heartbeat.ack = false
            this.#heartbeat.lastHeartbeat = null
            this.ping = -1

            if (!resume) {
                this.#lastSequence = null
                this.#sessionId = null
            }

            if (!restart) return resolve()
            else this.status = ShardStatus.CONNECTING

            this.#resetTimer = setTimeout(() => {
                throw new GatewayError(this.id, ShardError.UNKNOWN, 'Connection timeout')
            }, this.#client.coreOptions.connectionTimeout)

            try {
                this.#ws = new WebSocket(Endpoint.GATEWAY)
            } catch {
                throw new GatewayError(this.id, ShardError.INVALID_API_VERSION, `Failed to open new connection to ${Endpoint.GATEWAY}`)
            }

            this.#ws.onopen = () => {
                clearTimeout(this.#resetTimer)
                this.#heartbeat.ack = true
                this.status = ShardStatus.HANDSHAKING
                return resolve()
            }

            this.#ws.onerror = (event) => {
                this.#client.emit('shardWarn', this.id, `Connection error: ${event.message}`)
                this.#resetWS(true, true)
            }

            this.#ws.onclose = (event) => {
                switch (event.code) {
                    case ShardError.AUTHENTICATION_FAILED:
                    case ShardError.INVALID_SHARD:
                    case ShardError.SHARDING_REQUIRED:
                    case ShardError.INVALID_API_VERSION:
                    case ShardError.INVALID_INTENT:
                    case ShardError.DISSALLOWED_INTENT: {
                        this.#resetWS(false, false)
                        throw new GatewayError(this.id, event.code, event.reason)
                    }
                    default: {
                        let resumable = true

                        if (event.code === ShardError.INVALID_SEQUENCE) resumable = false
                        else if (event.code === ShardError.INVALID_SESSION) resumable = false

                        this.#client.emit('shardWarn', this.id, `Discord Gateway closed connection${resumable ? '. Reconnecting!' : ' and invalidated session. Opening new session!'}`)
                        this.#resetWS(true, resumable)
                    }
                }
            }

            this.#ws.onmessage = (event) => {
                const payload = JSON.parse(event.data.toString()) as Payload
                if (payload.s) this.#lastSequence = payload.s

                this.#handlePayload(payload)
                if (this.#expose) this.#client.emit('shardRawPayload', this.id, payload)
            }
        })
    }

    #sendHeartbeat(inLoop?: boolean) {
        if (!this.#heartbeat.ack) {
            this.#client.emit('shardWarn', this.id, 'Failed to acknowledge last heartbeat. Assuming zombified connection. Reconnecting!')
            this.#resetWS(true, true)
            return
        }

        this.#heartbeat.ack = false
        this.#heartbeat.lastHeartbeat = Date.now()

        this.send({ op: OPCode.HEARTBEAT, d: this.#lastSequence })
        if (inLoop) this.#heartbeat.timer = setTimeout(() => this.#sendHeartbeat(true), this.#heartbeat.interval)
    }

    #handlePayload(payload: Payload) {
        switch (payload.op) {
            case OPCode.DISPATCH: {
                this.#handleEvent(payload)
                break
            }
            case OPCode.HEARTBEAT: {
                this.#sendHeartbeat(false)
                break
            }
            case OPCode.RECONNECT: {
                this.#client.emit('shardWarn', this.id, 'Discord Gateway sent reconnect request. Reconnecting!')
                this.#resetWS(true, true)
                break
            }
            case OPCode.INVALID_SESSION: {
                this.#client.emit('shardWarn', this.id, `Discord Gateway invalidated ${payload.d ? 'connection. Reconnecting!' : 'session. Opening new session!'}`)
                this.#resetWS(true, payload.d)
                break
            }
            case OPCode.HELLO: {
                if (this.#sessionId) {
                    this.send({
                        op: OPCode.RESUME,
                        d: {
                            token: this.#client.token,
                            session_id: this.#sessionId,
                            seq: this.#lastSequence
                        }
                    })
                } else {
                    const payload = {
                        op: OPCode.IDENTIFY,
                        d: {
                            token: this.#client.token,
                            shard: [this.id, this.#client.coreOptions.shardCount as number],
                            intents: this.#client.coreOptions.intents,
                            large_threshold: this.#client.coreOptions.largeThreshold,
                            properties: {
                                $os: 'linux',
                                $browser: 'derun',
                                $device: 'derun'
                            }
                        }
                    }

                    // This param is only used if you want to sync multiple shards.
                    if (this.#client.coreOptions.shardCount === 1) delete payload.d.shard

                    this.send(payload)
                }

                this.#heartbeat.interval = payload.d.heartbeat_interval
                this.#sendHeartbeat(true)
                break
            }
            case OPCode.HEARTBEAT_ACK: {
                this.#heartbeat.ack = true
                this.ping = Date.now() - this.#heartbeat.lastHeartbeat
                break
            }
        }
    }

    #handleEvent(payload: Payload) {
        switch (payload.t) {
            case 'READY': {
                this.status = ShardStatus.CONNECTED
                this.#sessionId = payload.d.session_id
                if (!this.#client.user) this.#client.user = Object.freeze(new User(payload.d.user))
                this.#client.emit('shardReady', this.id)
                break
            }
            case 'RESUMED': {
                this.status = ShardStatus.CONNECTED
                this.#client.emit('shardResumed', this.id)
                break
            }
            case 'INTERACTION_CREATE': {
                if (payload.d.type === InteractionType.APPLICATION_COMMAND) this.#client.emit('interaction', new CommandInteraction(payload.d, this.#client), this.id)
                else this.#client.emit('interaction', new Interaction(payload.d), this.id)
                break
            }
        }
    }
}
