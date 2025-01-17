export class Collection<DataType> extends Map<string, DataType> {
    set(key: string, item: DataType) {
        if (typeof key !== 'string') key = `${key}` // Force key to be a string
        return super.set(key, item)
    }

    find(fn: (item: DataType) => boolean): DataType {
        for (const item of this.values()) {
            if (fn(item)) return item
        }
    }

    filter(fn: (item: DataType) => boolean): DataType[] {
        const results = new Array<DataType>()

        for (const item of this.values()) {
            if (fn(item)) results.push(item)
        }

        return results
    }
}
