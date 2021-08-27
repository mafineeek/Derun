/** Utility class to hold a bunch of something
 * @extends Map
 */
export default class Collection<K, V> extends Map<K, V> {
    constructor(limit?: number) {
        super()

        this.limit = limit
    }

    public readonly limit
}
