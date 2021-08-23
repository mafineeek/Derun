import { format } from 'util'
import WebSocket from 'ws'
import { Endpoint, GatewayCloseError, GatewayEvent, OPCode } from '../constants'
import GatewayError from '../Errors/GatewayError'
import { GeneralPayload, IdentityPayload, ResumePayload } from '../Interfaces/Payloads'
import ShardManager from './ShardManager'

export default class Shard {
    constructor(manager: ShardManager, id: number) {
        this._manager = manager
        this._id = id
        this._wsConnect(false)
    }

    private readonly _manager
    private readonly _id
    private readonly _createdAt = Date.now()
    private _ws?: WebSocket
    private _wsConnectTimer?: NodeJS.Timeout
    private _wsHeartbeatInterval?: number
    private _wsHeartbeatTimer?: NodeJS.Timeout
    private _wsLastHeartbeat?: number
    private _wsMissedheartbeats = 0
    private _wsPing = 0
    private _sessionId?: string
    private _lastSequence = 0

    public get id() {
        return this._id
    }

    public get createdAt() {
        return this._createdAt
    }

    public get ping() {
        return this._wsPing
    }

    private _authenticate() {
        let payload: ResumePayload | IdentityPayload

        if (this._sessionId) {
            payload = {
                op: OPCode.RESUME,
                d: {
                    token: this._manager.token,
                    session_id: this._sessionId,
                    seq: this._lastSequence
                }
            }
        } else {
            payload = {
                op: OPCode.IDENTIFY,
                d: {
                    token: this._manager.token,
                    shard: [this._id, this._manager.shardCount as number],
                    intents: this._manager.intents,
                    large_threshold: 50,
                    properties: {
                        $os: 'linux',
                        $browser: 'derun',
                        $device: 'derun'
                    }
                }
            }

            // This param is only used if you want to sync multiple shards.
            if (this._manager.shardCount === 1) delete payload.d.shard

            this._wsSend(payload)
        }
    }

    private _wsConnect(resume: boolean) {
        this._wsDisconnect()

        if (!resume) {
            this._sessionId = undefined
            this._lastSequence = 0
        }

        let connecting = true

        this._wsConnectTimer = setTimeout(() => {
            if (connecting) {
                this._manager.emit('shardError', this._id, `Failed to connect with ${Endpoint.GATEWAY} within 30 seconds.`)
                this._wsConnect(false)
            }
        }, 30000)

        if (this._ws) return this._manager.emit('shardWarn', this._id, 'Already connected.')

        try {
            this._ws = new WebSocket(Endpoint.GATEWAY)
        } catch {
            throw new GatewayError({ shardId: this._id, code: GatewayCloseError.INVALID_API_VERSION, reason: `Failed to open new connection to ${Endpoint.GATEWAY}.` })
        }

        this._ws.onopen = () => {
            connecting = false
            clearTimeout(this._wsConnectTimer)
        }

        this._ws.onclose = (event) => {
            let resumable = true

            switch (event.code) {
                case 1000:
                case GatewayCloseError.UNKNOWN: {
                    this._manager.emit('shardWarn', this._id, `Discord Gateway closed connection for unknown reason. Resumable = ${resumable}`)
                    this._wsConnect(resumable)
                    break
                }
                case GatewayCloseError.RECONNECT: {
                    this._manager.emit('shardWarn', this._id, `Discord Gatway forced reconnect. Resumable = ${resumable}`)
                    this._wsConnect(resumable)
                    break
                }
                case GatewayCloseError.INVALID_SEQUENCE: {
                    resumable = false
                    this._manager.emit('shardWarn', this._id, `Desynchronization! Stored last sequence value has been invalidated. Shard will try to open new session. Resumable = ${resumable}`)
                    this._wsConnect(resumable)
                    break
                }
                case GatewayCloseError.INVALID_SESSION: {
                    resumable = false
                    this._manager.emit('shardWarn', this._id, `Discord Gateway decided to invalidate current session. Shard will try to open new session. Resumable = ${resumable}`)
                    this._wsConnect(resumable)
                    break
                }
                default:
                    throw new GatewayError({ shardId: this._id, code: event.code, reason: event.reason })
            }
        }

        this._ws.onerror = (event) => this._manager.emit('shardWarn', this._id, `Connection error: ${format(event.error)}`)

        this._ws.onmessage = (event) => {
            if (event.data) this._handlePayload(JSON.parse(event.data.toString()))
        }
    }

    private _wsDisconnect(code = 1012) {
        if (!this._ws) return

        clearTimeout(this._wsConnectTimer)
        clearTimeout(this._wsHeartbeatTimer)
        this._wsHeartbeatTimer = undefined
        this._wsLastHeartbeat = undefined
        this._wsMissedheartbeats = 0
        this._wsPing = 0
        this._ws.removeAllListeners()
        this._ws.close(code)
        this._ws = undefined
    }

    private _wsSend(payload: GeneralPayload) {
        if (this._ws) this._ws.send(JSON.stringify(payload))
    }

    private _heartbeat(inLoop: boolean) {
        if (this._wsMissedheartbeats > 3) {
            this._manager.emit('shardWarn', this._id, 'Heartbeat timeout.')
            this._wsConnect(true)
        } else {
            if (this._ws && this._ws.readyState === 1) {
                this._wsMissedheartbeats++
                this._wsLastHeartbeat = Date.now()
                this._wsSend({ op: 1, d: this._lastSequence || null })

                if (inLoop) this._wsHeartbeatTimer = setTimeout(() => this._heartbeat(true), this._wsHeartbeatInterval * Math.random())
            }
        }
    }

    private _handlePayload(payload: GeneralPayload) {
        if (payload.s && payload.s > this._lastSequence) this._lastSequence = payload.s

        switch (payload.op) {
            case OPCode.DISPATCH: {
                this._handleEvent(payload)
                break
            }
            case OPCode.HEARTBEAT: {
                this._heartbeat(false)
                break
            }
            case OPCode.RECONNECT: {
                this._manager.emit('shardWarn', this._id, 'Discord Gatway forced reconnect.')
                this._wsConnect(true)
                break
            }
            case OPCode.INVALID_SESSION: {
                this._manager.emit('shardWarn', this._id, `Invalid session. Resumable: ${payload.d}`)
                if (payload.d) this._authenticate()
                //else this._wsConnect(false)
                // I'm ignoring it for now for the testing reasons.
                break
            }
            case OPCode.HELLO: {
                this._wsHeartbeatInterval = payload.d.heartbeat_interval
                this._heartbeat(true)
                this._authenticate()
                break
            }
            case OPCode.HEARTBEAT_ACK: {
                this._wsPing = Date.now() - this._wsLastHeartbeat ?? 0
                this._wsMissedheartbeats = 0
                break
            }
            default: {
                this._manager.emit('shardRawPayload', this._id, payload)
                break
            }
        }
    }

    private _handleEvent(payload: GeneralPayload) {
        switch (payload.t) {
            case GatewayEvent.READY: {
                this._sessionId = payload.d.session_id
                this._manager.emit('shardReady', this._id)
                if (this._id === this._manager.shardCount) this._manager.emit('ready')
                break
            }
            case GatewayEvent.RESUMED: {
                this._manager.emit('shardResumed', this._id)
            }
            default: {
                this._manager.emit('shardRawPayload', this._id, payload)
                break
            }
        }
    }
}
