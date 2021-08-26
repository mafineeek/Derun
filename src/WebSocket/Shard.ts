import WebSocket from 'ws'
import { Endpoint, GatewayCloseError, GatewayEvent, OPCode } from '../constants'
import GatewayError from '../Errors/GatewayError'
import { sleep } from '../functions'
import { HeartbeatOptions } from '../Interfaces/Options'
import { GeneralPayload, IdentityPayload, ResumePayload } from '../Interfaces/Payloads'
import ShardManager from './ShardManager'

export default class Shard {
    constructor(manager: ShardManager, id: number) {
        this._manager = manager
        this._id = id

        this._connect()
    }

    private readonly _manager
    private readonly _id

    private _ws: WebSocket
    private _lastSequence = 0
    private _sessionId: string

    private _heartbeat: HeartbeatOptions = {
        interval: null,
        timer: null,
        ack: false,
        ping: null,
        lastHeartbeat: null
    }

    public get connected() {
        return this._ws && this._ws.readyState === WebSocket.OPEN
    }

    public send(payload: GeneralPayload) {
        if (this.connected) this._ws.send(JSON.stringify(payload))
    }

    private async _connect(resume?: boolean, code = 1000) {
        if (resume && code < 4000) code = 4000 // Resume can only happen with non-1000 exit code

        await this._destroy(code)

        if (!resume) {
            this._lastSequence = 0
            this._sessionId = null
            this._heartbeat.interval = null
        }
        else await sleep(5000)

        try {
            this._ws = new WebSocket(Endpoint.GATEWAY)
        } catch {
            throw new GatewayError({ shardId: this._id, code: GatewayCloseError.INVALID_API_VERSION, reason: `Failed to open new connection to ${Endpoint.GATEWAY}.` })
        }

        this._heartbeat.ack = true

        this._ws.onerror = (event) => {
            this._manager.emit('shardWarn', this._id, `Connection error: ${event.message}`)
            this._connect(true)
        }

        this._ws.onclose = (event) => {
            switch (event.code) {
                case GatewayCloseError.AUTHENTICATION_FAILED:
                case GatewayCloseError.INVALID_SHARD:
                case GatewayCloseError.SHARDING_REQUIRED:
                case GatewayCloseError.INVALID_API_VERSION:
                case GatewayCloseError.INVALID_INTENT:
                case GatewayCloseError.DISSALLOWED_INTENT: {
                    this._destroy(event.code)
                    throw new GatewayError({ shardId: this._id, code: event.code, reason: event.reason })
                }
                default: {
                    let resumable = true

                    if (event.code === GatewayCloseError.INVALID_SEQUENCE) resumable = false
                    else if (event.code === GatewayCloseError.INVALID_SESSION) resumable = false

                    this._connect(resumable)
                }
            }
        }

        this._ws.onmessage = (event) => {
            const payload = JSON.parse(event.data.toString()) as GeneralPayload
            if (payload.s && payload.s > this._lastSequence) this._lastSequence = payload.s

            this._handlePayload(payload)
        }
    }

    private async _destroy(code = 1000) {
        if (this._ws) {
            this._ws.removeAllListeners()
            this._ws.onopen = this._ws.onclose = this._ws.onerror = this._ws.onmessage = null

            try {
                this._ws.close(code)
            } catch {
                /** Do Nothing. */
            }

            this._ws = null
            await sleep(2500) // Just in case
        }

        clearTimeout(this._heartbeat.timer)
        this._heartbeat.ack = false
        this._heartbeat.ping = null
        this._heartbeat.lastHeartbeat = null
    }

    private _identify() {
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

            this.send(payload)
        }
    }

    private _sendHeartbeat(inLoop?: boolean) {
        if (!this._heartbeat.ack) {
            this._manager.emit('shardWarn', this._id, 'Failed to acknowledge last heartbeat. Assuming zombified connection. Shard will try to resume session.')
            this._connect(true)
            return
        }

        this._heartbeat.ack = false
        this._heartbeat.lastHeartbeat = Date.now()

        this.send({ op: OPCode.HEARTBEAT, d: this._lastSequence })
        if (inLoop) this._heartbeat.timer = setTimeout(() => this._sendHeartbeat(true), this._heartbeat.interval)
    }

    private _handlePayload(payload: GeneralPayload) {
        switch (payload.op) {
            case OPCode.DISPATCH: {
                switch (payload.t) {
                    case GatewayEvent.READY: {
                        this._sessionId = payload.d.session_id
                        this._manager.emit('shardReady', this._id)
                        if (this._id + 1 === this._manager.shardCount) this._manager.emit('ready')
                        break
                    }
                    case GatewayEvent.RESUMED: {
                        this._manager.emit('shardResumed', this._id)
                        break
                    }
                }
            }
            case OPCode.HEARTBEAT: {
                this._sendHeartbeat()
                break
            }
            case OPCode.RECONNECT: {
                this._manager.emit('shardWarn', this._id, 'Discord Gateway forced reconnect.')
                this._connect(true)
                break
            }
            case OPCode.INVALID_SESSION: {
                this._manager.emit('shardWarn', this._id, `Discord Gateway invalidated session.`)
                this._connect(payload.d)
                break
            }
            case OPCode.HELLO: {
                this._identify()
                this._heartbeat.ack = true
                this._heartbeat.interval = payload.d.heartbeat_interval
                this._sendHeartbeat(true)
            }
            case OPCode.HEARTBEAT_ACK: {
                this._heartbeat.ack = true
                this._heartbeat.ping = Date.now() - this._heartbeat.lastHeartbeat
                break
            }
            default: this._manager.emit('shardWarn', this._id, payload)
        }
    }
}
