import ShardManager from './ShardManager'
import WebSocket from 'ws'
import { DropCodeList, Endpoint, ErrorCodeList, GatewayEvent, OPCode } from '../constants'
import { format } from 'util'
import { GeneralPayload, IdentityPayload, ResumePayload } from '../Interfaces/Payloads'
import { sleep } from '../functions'

export default class Shard {
    constructor(manager: ShardManager, id: number) {
        this._manager = manager
        this._id = id
        this._wsConnect()
    }

    // Bound (from constructor)
    private readonly _manager
    private readonly _id
    private readonly _createdAt = Date.now()

    // WebSocket
    private _ws?: WebSocket
    private _wsConnectAttempts = 0
    private _wsConnectTimer?: NodeJS.Timeout
    private _wsHeartbeatInterval?: number
    private _wsHeartbeatTimer?: NodeJS.Timeout
    private _wsLastHeartbeat?: number
    private _wsLastHeartbeatAck = false
    private _wsPing = 0

    // Gateway core
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

    private async _wsConnect(resume?: boolean) {
        this._wsDisconnect()

        this._wsConnectAttempts++
        if (this._wsConnectAttempts >= 3) {
            this._manager.emit('shardError', this._id, 'Automatically invalidating session due to excessive resume attempts.')
            this._wsConnectAttempts = 0
            await sleep(Math.min(Math.round(30000 * (Math.random() * 2 + 1)), 30000))
            this._wsConnect()
            return
        }

        if (!resume) {
            this._sessionId = undefined
            this._lastSequence = 0
        }

        if (this._ws) return this._manager.emit('shardWarn', this._id, 'Already connected.')

        try {
            this._ws = new WebSocket(Endpoint.GATEWAY)
        } catch {
            return this._manager.emit('shardError', this._id, 'Unable to create a socket.')
        }

        this._ws.onopen = () => {
            this._wsConnectAttempts = 0
            this._wsLastHeartbeatAck = true
            clearTimeout(this._wsConnectTimer)
        }

        this._ws.onclose = (event) => {
            this._wsDisconnect(event.code)

            if (ErrorCodeList.includes(event.code)) this._manager.emit('shardError', this._id, `Closed connection to Discord Gateway with code ${event.code}.`)
            else this._wsConnect(!DropCodeList.includes(event.code))
        }

        this._ws.onerror = (event) => this._manager.emit('shardWarn', this._id, `Connection error: ${format(event.error)}`)

        this._ws.onmessage = (event) => {
            if (event.data) this._handlePayload(JSON.parse(event.data.toString()))
        }

        this._wsConnectTimer = setTimeout(() => {
            this._manager.emit('shardError', this._id, 'Connection timeout (30s).')
            this._wsConnect()
        }, 30000)
    }

    private _wsDisconnect(code = 1012) {
        if (!this._ws) return

        clearTimeout(this._wsHeartbeatTimer)
        this._wsHeartbeatTimer = undefined
        this._wsLastHeartbeat = undefined
        this._wsPing = 0
        this._ws.removeAllListeners()
        this._ws.close(code)
        this._ws = undefined
    }

    private _wsSend(payload: GeneralPayload) {
        if (this._ws) this._ws.send(JSON.stringify(payload))
    }

    private _heartbeat(inLoop: boolean) {
        if (this._wsLastHeartbeatAck) {
            if (this._ws && this._ws.readyState === 1) {
                this._wsLastHeartbeatAck = false
                this._wsLastHeartbeat = Date.now()
                this._wsSend({ op: 1, d: this._lastSequence || null })

                if (inLoop) this._wsHeartbeatTimer = setTimeout(() => this._heartbeat(true), this._wsHeartbeatInterval * Math.random())
            }
        } else {
            this._manager.emit('shardWarn', this._id, 'Heartbeat timeout.')
            this._wsConnect(true)
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
                else this._wsConnect()
                break
            }
            case OPCode.HELLO: {
                this._authenticate()
                this._wsLastHeartbeatAck = true
                this._wsHeartbeatInterval = payload.d.heartbeat_interval
                this._heartbeat(true)
                break
            }
            case OPCode.HEARTBEAT_ACK: {
                this._wsPing = Date.now() - this._wsLastHeartbeat ?? 0
                this._wsLastHeartbeatAck = true
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
