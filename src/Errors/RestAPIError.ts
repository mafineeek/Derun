export class RestAPIError extends Error {
    constructor(code: number | string, reason: string) {
        super(`[${code ?? 0}] ${reason}${reason.endsWith('.') ? '' : '.'}`)
        this.name = this.constructor.name
        // Error.captureStackTrace(this, this.constructor)
    }

    #toString() {
        return `[${this.name}]`
    }

    #toJSON() {
        return {
            message: this.message,
            name: this.name,
            stack: this.stack
        }
    }
}
