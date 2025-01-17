import { BitField } from '../Util/Bitfield'

// Last updated:
// Mon, 30 Aug 2021 22:16:04 GMT
export class Intent extends BitField<keyof typeof Intent.FLAGS> {
    static FLAGS = {
        GUILDS: 1 << 0,
        GUILD_MEMBERS: 1 << 1,
        GUILD_BANS: 1 << 2,
        GUILD_EMOJIS_AND_STICKERS: 1 << 3,
        GUILD_INTEGRATIONS: 1 << 4,
        GUILD_WEBHOOKS: 1 << 5,
        GUILD_INVITES: 1 << 6,
        GUILD_VOICE_STATES: 1 << 7,
        GUILD_PRESENCES: 1 << 8,
        GUILD_MESSAGES: 1 << 9,
        GUILD_MESSAGE_REACTIONS: 1 << 10,
        GUILD_MESSAGE_TYPING: 1 << 11,
        DIRECT_MESSAGES: 1 << 12,
        DIRECT_MESSAGE_REACTIONS: 1 << 13,
        DIRECT_MESSAGE_TYPING: 1 << 14
    }
}
