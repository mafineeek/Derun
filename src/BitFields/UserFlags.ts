import { BitField } from '../Util/Bitfield'

// Last updated:
// Mon, 30 Aug 2021 22:16:04 GMT
export class UserFlags extends BitField<keyof typeof UserFlags.FLAGS> {
    static FLAGS = {
        DISCORD_EMPLOYEE: 1,
        PARTNERED_SERVER_OWNER: 1 << 1,
        HYPESQUAD_EVENTS: 1 << 2,
        BUG_HUNTER_LEVEL_1: 1 << 3,
        // 1 << 4
        // 1 << 5
        HOUSE_BRAVERY: 1 << 6,
        HOUSE_BRILLIANCE: 1 << 7,
        HOUSE_BALANCE: 1 << 8,
        EARLY_SUPPORTER: 1 << 9,
        TEAM_USER: 1 << 10,
        // 1 << 11,
        SYSTEM: 1 << 12,
        // 1 << 13,
        BUG_HUNTER_LEVEL_2: 1 << 14,
        // 1 << 15,
        VERIFIED_BOT: 1 << 16,
        EARLY_VERIFIED_BOT_DEVELOPER: 1 << 17
    }
}
