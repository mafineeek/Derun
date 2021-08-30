import { EventListenerOptions } from '../Typings/options'

/** Strictly typed Event Emitter for Deno, copied source from  https://github.com/Amatsagu/EventEmitter */
export class EventEmitter<T> {
    constructor(maxListeners?: number) {
        this.#maxListeners = maxListeners ?? 5
    }

    readonly #maxListeners
    readonly #cache = new Map<keyof T, EventListenerOptions<T>[]>()

    public on<Event extends keyof T>(event: Event, callback: T[Event]) {
        this.push(event, { callback })
    }

    public once<Event extends keyof T>(event: Event, callback: T[Event]) {
        this.push(event, { once: true, callback })
    }

    /**
     * Removes listener(s) from targeted event.
     * By default it gonna delete all listeners from particular event. You can delete specific listener by parsing it as second parameter.
     * It gonna return boolean value depending on result.
     */
    public off<Event extends keyof T>(event: Event, callback?: T[Event]): boolean {
        if (!callback) return this.#cache.delete(event)

        let bucket = this.#cache.get(event)
        if (!bucket) return false

        const listenerCount = bucket.length
        bucket = bucket.filter((item) => item.callback !== callback)

        if (bucket.length === listenerCount) return false
        else {
            this.#cache.set(event, bucket)
            return true
        }
    }

    /** Synchronously calls each of the registered listeners (callbacks) in order. */
    // deno-lint-ignore no-explicit-any
    public emit(event: keyof T, ...args: any) {
        let bucket = this.#cache.get(event)
        if (!bucket) return

        // deno-lint-ignore ban-types
        for (const item of bucket.values()) (item.callback as unknown as Function)(...args)

        const listenerCount = bucket.length
        bucket = bucket.filter((item) => !item.once)

        if (listenerCount !== bucket.length) this.#cache.set(event, bucket)
    }

    private push(slot: keyof T, item: EventListenerOptions<T>) {
        const bucket = this.#cache.get(slot) ?? []
        if (this.#maxListeners && this.#maxListeners > 0 && bucket.length >= this.#maxListeners) {
            const error = new TypeError()
            error.name = 'EventEmitterError'
            error.message = `You cannot assign more than ${this.#maxListeners} listeners to "${slot}" event. You can increase this limit by setting custom max limit in constructor.`

            throw error
        }

        bucket.push(item)
        this.#cache.set(slot, bucket)
    }
}
