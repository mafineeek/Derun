// @ts-nocheck
// @ts-ignore

import { BitFieldResolvable } from '../Typings/options'

/** Naive, utility data structure to work with Discord bitfields. */
export class BitField<F> {
    constructor(bits: BitFieldResolvable = 0) {
        this.#bitfield = this.#resolve(bits)
    }

    readonly #bitfield

    /** The flags for this bitfield. */
    static FLAGS: { [permission: string]: number | bigint } = {}

    /** Checks whether the bitfield has a flag. */
    has(flag: F): boolean {
        const v = this.constructor.FLAGS[flag]
        return !!(this.#bitfield & (typeof v === 'number' ? BigInt(v) : v))
    }

    /** Gets an object mapping field names to a {@link Boolean boolean} indicating whether the bit is available. */
    serialize(): { [key: F]: boolean } {
        const serialized: { [key: F]: boolean } = {}

        for (const flag of Object.keys(this.constructor.FLAGS)) {
            serialized[flag] = this.has(flag)
        }

        return serialized
    }

    /** Gets an {@link Array} of bitfield names based on the bits available. */
    toArray(): F[] {
        return Object.keys(this.constructor.FLAGS).filter((flag) => this.has(flag))
    }

    /** Gets a raw value for this bitfield. */
    valueOf(): number {
        return this.#bitfield
    }

    *[Symbol.iterator]() {
        yield* this.toArray()
    }

    #resolve(bits?: BitFieldResolvable): bigint {
        if (!bits) return 0n

        switch (typeof bits) {
            case 'number':
                return BigInt(bits)
            case 'bigint':
                return bits
            case 'string':
                bits = [bits]
            case 'object': {
                if (Array.isArray(bits)) {
                    let bitmask = 0n

                    for (const bit of bits) {
                        const flagValue = this.constructor.FLAGS[bit]
                        typeof flagValue === 'number' ? (bitmask |= BigInt(flagValue)) : (bitmask |= flagValue)
                    }

                    return bitmask
                }
            }
            default:
                return 0n
        }
    }
}
