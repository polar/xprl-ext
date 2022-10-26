/**
 * This class is the base of all accounts, which contains some common useful functions.
 */
export class AccountBase {
    /**
     * This option is a promise that delays. It calls setTimeout to resolve something later.
     * It is effectively a sleep call.
     *      later(1000)
     *        .then(() => log("Hello later"))
     * @param delay
     * @param value
     */
    later<T>(delay: number, value?: T): Promise<T> {
        return new Promise(resolve => setTimeout(resolve, delay, value));
    }

    /**
     * This function takes a promise and keeps executing it until the condition is true or the
     * limit is reached. A limit of -1 means essentially 2^32 times.
     * @param action
     * @param cond
     * @param limit
     */
    until<T>(action: () => Promise<T>, cond: (arg0: T) => boolean | undefined, limit: number = -1): Promise<T> {
        return action.call(this)
            .then(res => limit === 0 || cond(res) ?
                Promise.resolve(res) :
                this.until(action, cond, limit - 1))
    }
}
