export enum Endpoint {
    GATEWAY = 'wss://gateway.discord.gg/?v=9&encoding=json',
    REST = 'https://discord.com/api/v9',
    CDN = 'https://cdn.discordapp.com'
}

export const CDNEndpoint = {
    Avatar: (userId: string, avatarHash: string) => `${Endpoint.CDN}/avatars/${userId}/${avatarHash}`,
    DefaultAvatar: (userDiscriminator: string) => `${Endpoint.CDN}/embed/avatars/${userDiscriminator}`
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

export enum SlashCommandType {
    SUB_COMMAND = 1,
    SUB_COMMAND_GROUP = 2,
    STRING = 3,
    INTEGER = 4,
    BOOLEAN = 5,
    USER = 6,
    CHANNEL = 7,
    ROLE = 8,
    MENTIONABLE = 9,
    NUMBER = 10
}

export enum ComponentType {
    ACTION_ROW = 1,
    BUTTON = 2,
    SELECT_MENU = 3
}

export enum ButtonStyle {
    /** Color: Blurple (Discord theme) */
    PRIMARY = 1,
    /** Color: Grey */
    SECONDARY = 2,
    /** Color: Green */
    SUCCESS = 3,
    /** Color: Red */
    DANGER = 4,
    /** Color: Grey | Navigates to specified URL. Required url field to be set. */
    LINK = 5
}

export enum InteractionType {
    PING = 1,
    APPLICATION_COMMAND = 2,
    MESSAGE_COMPONENT = 3
}

export enum InteractionCommandType {
    CHAT_INPUT = 1,
    USER = 2,
    MESSAGE = 3
}

export const ActivityType = {
    Playing: 0,
    Streaming: 1,
    Listening: 2,
    Watching: 3
}

export enum InteractionCallbackType {
    PONG = 1,
    CHANNEL_MESSAGE_WITH_SOURCE = 4,
    DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE = 5,
    DEFERRED_UPDATE_MESSAGE = 6,
    UPDATE_MESSAGE = 7
}
