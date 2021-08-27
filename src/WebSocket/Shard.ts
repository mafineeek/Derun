import WebSocket from 'ws'
import { Endpoint, OPCode, ShardError, ShardStatus } from '../constants'
import { GatewayError } from '../Errors/GatewayError'
import { sleep } from '../functions'
import { ShardManager } from './ShardManager'

export interface Payload {
    op: number
    d?: any
    s?: number
    t?: string
}

export interface HeartbeatOptions {
    interval?: number
    timer?: NodeJS.Timeout
    ack: boolean
    lastHeartbeat?: number
}

export class Shard {
    constructor(manager: ShardManager, id: number) {
        this.#manager = manager
        this.id = id
        this.#resetWS(true, false)
    }

    readonly #manager
    readonly id
    ping?: number
    status: ShardStatus = ShardStatus.UNAVAILABLE

    #ws?: WebSocket
    #resetTimer?: NodeJS.Timeout
    #heartbeat: HeartbeatOptions = {
        interval: null,
        timer: null,
        ack: false,
        lastHeartbeat: null
    }
    #lastSequence?: number
    #sessionId?: string

    public send(payload: Payload) {
        if (this.status < ShardStatus.HANDSHAKING) return

        try {
            this.#ws.send(JSON.stringify(payload))
        } catch {
            throw new GatewayError({ shardId: this.id, code: ShardError.DECODE_ERROR, reason: 'Failed to stringify payload. It may hold invalid data.' })
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

            if (!resume) {
                this.#lastSequence = null
                this.#sessionId = null
            }

            if (!restart) return resolve()
            else this.status = ShardStatus.CONNECTING

            this.#resetTimer = setTimeout(() => {
                throw new GatewayError({ shardId: this.id, code: ShardError.UNKNOWN, reason: `Connection timeout.` })
            }, this.#manager.shardOptions.connectionTimeout)

            try {
                this.#ws = new WebSocket(Endpoint.GATEWAY)
            } catch {
                throw new GatewayError({ shardId: this.id, code: ShardError.INVALID_API_VERSION, reason: `Failed to open new connection to ${Endpoint.GATEWAY}.` })
            }

            this.#ws.onopen = () => {
                clearTimeout(this.#resetTimer)
                this.#heartbeat.ack = true
                this.status = ShardStatus.HANDSHAKING
                return resolve()
            }

            this.#ws.onerror = (event) => {
                this.#manager.emit('shardWarn', this.id, `Connection error: ${event.message}`)
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
                        throw new GatewayError({ shardId: this.id, code: event.code, reason: event.reason })
                    }
                    default: {
                        let resumable = true

                        if (event.code === ShardError.INVALID_SEQUENCE) resumable = false
                        else if (event.code === ShardError.INVALID_SESSION) resumable = false

                        this.#manager.emit('shardWarn', this.id, `Discord Gateway closed connection${resumable ? '. Reconnecting!' : ' and invalidated session. Opening new session!'}`)
                        this.#resetWS(true, resumable)
                    }
                }
            }

            this.#ws.onmessage = (event) => {
                const payload = JSON.parse(event.data.toString()) as Payload
                if (payload.s) this.#lastSequence = payload.s

                this.#handlePayload(payload)
            }
        })
    }

    #sendHeartbeat(inLoop?: boolean) {
        if (!this.#heartbeat.ack) {
            this.#manager.emit('shardWarn', this.id, 'Failed to acknowledge last heartbeat. Assuming zombified connection. Reconnecting!')
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
                this.#manager.emit('shardWarn', this.id, 'Discord Gateway sent reconnect request. Reconnecting!')
                this.#resetWS(true, true)
                break
            }
            case OPCode.INVALID_SESSION: {
                this.#manager.emit('shardWarn', this.id, `Discord Gateway invalidated ${payload.d ? 'connection. Reconnecting!' : 'session. Opening new session!'}`)
                this.#resetWS(true, payload.d)
                break
            }
            case OPCode.HELLO: {
                if (this.#sessionId) {
                    this.send({
                        op: OPCode.RESUME,
                        d: {
                            token: this.#manager.token,
                            session_id: this.#sessionId,
                            seq: this.#lastSequence
                        }
                    })
                } else {
                    const payload = {
                        op: OPCode.IDENTIFY,
                        d: {
                            token: this.#manager.token,
                            shard: [this.id, this.#manager.shardOptions.shardCount as number],
                            intents: this.#manager.shardOptions.intents,
                            large_threshold: this.#manager.shardOptions.largeThreshold,
                            properties: {
                                $os: 'linux',
                                $browser: 'derun',
                                $device: 'derun'
                            }
                        }
                    }

                    // This param is only used if you want to sync multiple shards.
                    if (this.#manager.shardOptions.shardCount === 1) delete payload.d.shard

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
            default:
                this.#manager.emit('shardRawPayload', this.id, payload)
        }
    }

    #handleEvent(payload: Payload) {
        switch (payload.t) {
            case 'READY': {
                this.status = ShardStatus.CONNECTED
                this.#sessionId = payload.d.session_id
                this.#manager.emit('shardReady', this.id)
                break
            }
            case 'RESUMED': {
                this.status = ShardStatus.CONNECTED
                this.#manager.emit('shardResumed', this.id)
                break
            }
            default:
                this.#manager.emit('shardRawPayload', this.id, payload)
        }
    }
}
