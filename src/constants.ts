export enum Endpoint {
    GATEWAY = 'wss://gateway.discord.gg/?v=9&encoding=json',
    REST = 'https://discord.com/api/v9'
}

export enum OPCode {
    DISPATCH = 0,
    HEARTBEAT = 1,
    IDENTIFY = 2,
    PRESENCE_UPDATE = 3,
    VOICE_STATE_UPDATE = 4,
    RESUME = 6,
    RECONNECT = 7,
    REQUEST_GUILD_MEMBERS = 8,
    INVALID_SESSION = 9,
    HELLO = 10,
    HEARTBEAT_ACK = 11
}

export enum ShardStatus {
    UNAVAILABLE = 0,
    CONNECTING = 1,
    HANDSHAKING = 2,
    CONNECTED = 3
}

export enum ShardError {
    RECONNECT = 1001,
    UNKNOWN = 4000,
    UNKNOWN_OPCODE = 4001,
    DECODE_ERROR = 4002,
    NOT_AUTHENTICATED = 4003,
    AUTHENTICATION_FAILED = 4004,
    ALREADY_AUTHENTICATED = 4005,
    INVALID_SEQUENCE = 4007,
    RATE_LIMITED = 4008,
    INVALID_SESSION = 4009,
    INVALID_SHARD = 4010,
    SHARDING_REQUIRED = 4011,
    INVALID_API_VERSION = 4012,
    INVALID_INTENT = 4013,
    DISSALLOWED_INTENT = 4014
}
