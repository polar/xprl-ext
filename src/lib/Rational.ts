let BigRat = require("big-rational")

/**
 * This class wraps the big-rational library into something usable with Typescript.
 */
export class RationalNumber {
    private _subject: any

    constructor(n: number | string | RationalNumber, d?: string | number) {
        this._subject = BigRat(n, d)
    }

    valueOf(): number {
        return this._subject.valueOf()
    }

    toString() {
        return this._subject.toString()
    }

    toDecimal(digits: number) {
        return this._subject.toDecimal(digits)
    }

    divide(n: string | number | RationalNumber | undefined) {
        if (n instanceof RationalNumber) {
            return new RationalNumber(this._subject.divide(n._subject))
        } else {
            return new RationalNumber(this._subject.divide(n))
        }
    }


    times(n: string | number | RationalNumber | undefined) {
        if (n instanceof RationalNumber) {
            return new RationalNumber(this._subject.times(n._subject))
        } else {
            return new RationalNumber(this._subject.times(n))
        }
    }

    add(n: string | number | RationalNumber | undefined) {
        if (n instanceof RationalNumber) {
            return new RationalNumber(this._subject.add(n._subject))
        } else {
            return new RationalNumber(this._subject.add(n))
        }
    }

    plus(n: string | number | RationalNumber | undefined) {
        return this.add(n)
    }

    subtract(n: string | number | RationalNumber | undefined) {
        if (n instanceof RationalNumber) {
            return new RationalNumber(this._subject.subtract(n._subject))
        } else {
            return new RationalNumber(this._subject.subtract(n))
        }
    }

    minus(n: string | number | RationalNumber | undefined) {
        return this.subtract(n)
    }

    abs() {
        return new RationalNumber(this._subject.abs())
    }

    negate() {
        return new RationalNumber(this._subject.negate())
    }

    sign() {
        return this.eq(0) ? RationalNumber.zero : this.gt(0) ? RationalNumber.one : Rational(-1)
    }

    eq(n: string | number | RationalNumber | undefined): boolean {
        if (n instanceof RationalNumber) {
            return this._subject.eq(n._subject)
        } else {
            return this._subject.eq(n)
        }
    }

    neq(n: string | number | RationalNumber | undefined): boolean {
        if (n instanceof RationalNumber) {
            return this._subject.neq(n._subject)
        } else {
            return this._subject.neq(n)
        }
    }

    leq(n: string | number | RationalNumber | undefined): boolean {
        if (n instanceof RationalNumber) {
            return this._subject.leq(n._subject)
        } else {
            return this._subject.leq(n)
        }
    }

    geq(n: string | number | RationalNumber | undefined): boolean {
        if (n instanceof RationalNumber) {
            return this._subject.geq(n._subject)
        } else {
            return this._subject.geq(n)
        }
    }

    lt(n: string | number | RationalNumber | undefined): boolean {
        if (n instanceof RationalNumber) {
            return this._subject.lt(n._subject)
        } else {
            return this._subject.lt(n)
        }
    }

    gt(n: string | number | RationalNumber | undefined): boolean {
        if (n instanceof RationalNumber) {
            return this._subject.gt(n._subject)
        } else {
            return this._subject.gt(n)
        }
    }

    static Rational(n: string | number | RationalNumber | undefined, d?: string | number): RationalNumber {
        if (n instanceof RationalNumber) {
            return new RationalNumber(BigRat(n._subject, d))
        }
        return new RationalNumber(BigRat(n, d))
    }

    static one = Rational(1)
    static zero = Rational(0)

    round(b?: boolean) {
        return new RationalNumber(this._subject.round(b))
    }

    floor(b?: boolean) {
        return new RationalNumber(this._subject.floor(b))
    }

    reciprocate() {
        return new RationalNumber((this._subject.reciprocate()))
    }

    static min(...args: RationalNumber[]) {
        return args.reduce((a, c) => a.lt(c) ? a : c)
    }

    static max(...args: RationalNumber[]) {
        return args.reduce((a, c) => a.gt(c) ? a : c)
    }
}

export function Rational(n: string | number | RationalNumber | undefined, d?: string | number): RationalNumber {
    return RationalNumber.Rational(n, d)
}
