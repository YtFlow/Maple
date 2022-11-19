type Queue = (() => void)[]
type Setter<T> = (t: T) => void

export class Mutex<T> {
    queue: Queue | undefined = undefined
    constructor(public data: T) { }
    lock(): Promise<MutexGuard<T>> {
        if (this.queue === undefined) {
            this.queue = []
            return Promise.resolve(new MutexGuard(this))
        }
        const q = this.queue
        return new Promise((resolve, _reject) => {
            q.push(() => resolve(new MutexGuard(this)))
        })
    }
    async withLock<U>(f: (data: T, setter: Setter<T>) => U): Promise<Awaited<U>> {
        const guard = await this.lock()
        try {
            const ret = await f(guard.data, v => void (guard.data = v))
            return ret
        } finally {
            guard.unlock()
        }
    }
}

export class MutexGuard<T> {
    constructor(private m: Mutex<T>) { }
    get data() {
        return this.m.data
    }
    set data(val) {
        this.m.data = val
    }
    unlock(): void {
        const q = this.m.queue
        if (q === undefined) {
            throw new Error('unlocking unlocked mutex')
        }
        const next = q.shift()
        if (next === undefined) {
            this.m.queue = undefined
        } else {
            next()
        }
    }
}
