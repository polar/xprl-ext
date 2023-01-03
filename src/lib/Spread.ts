import {IssuedCurrencyAmount} from "xrpl/dist/npm/models/common";

import {Rational, RationalNumber} from "rational"

export class Spread {
    _bid?: RationalNumber
    _ask?: RationalNumber
    _bidQuality?: RationalNumber
    _askQuality?: RationalNumber

    constructor(bid?: RationalNumber, ask?: RationalNumber) {
        this._bid = bid
        if (bid)
            this._bidQuality = RationalNumber.one.divide(bid)
        this._ask = ask
        if (ask)
            this._askQuality = RationalNumber.one.divide(ask)
    }

    set(offer: any) {
        if (offer && "TakerPays" in offer && "TakerGets" in offer) {
            let pays = offer.TakerPays
            let gets = offer.TakerGets
            if (typeof pays === "string") {
                // TakerPays XRP for Currency, which is a "buy". An offer to "buy" is a bid.
                this._bid = Rational((gets as IssuedCurrencyAmount).value).divide(Rational(pays, 1e6))
                this._bidQuality = Rational(pays).divide(Rational((gets as IssuedCurrencyAmount).value))
            } else {
                // TakerPays Currency for XRP, which is a "sell". And offer to sell is an askd.
                this._ask = Rational((pays as IssuedCurrencyAmount).value).divide(Rational(gets, 1e6))
                this._askQuality = Rational((pays as IssuedCurrencyAmount).value).divide(Rational(gets))
            }
        }
    }

    get diff() {
        if (this.hasAsk && this.hasBid) {
            return this.askRational!.subtract(this.bidRational!)
        }
    }

    set bid(x: number | string | undefined) {
        if (x)
            this._bid = Rational(x)
    }

    get bid() {
        if (this._bid)
            return Number(this._bid.toDecimal(15))
    }

    get bidQuality() {
        if (this._bidQuality)
            return Number(this._bidQuality.toDecimal(15))
    }

    get hasBid() {
        return this._bid !== undefined
    }

    get hasBidQuality() {
        return this._bid !== undefined
    }

    get hasAsk() {
        return this._ask !== undefined
    }

    get hasAskQuality() {
        return this._askQuality !== undefined
    }

    set ask(x: number | string | undefined) {
        if (x)
            this._ask = Rational(x)
    }

    get ask() {
        if (this._ask)
            return Number(this._ask.toDecimal(15))
    }

    get askQuality() {
        if (this._askQuality)
            return Number(this._askQuality.toDecimal(15))
    }

    get bidRational() {
        if (this._bid)
            return this._bid
    }

    get bidQualityRational() {
        if (this._bidQuality)
            return this._bidQuality
    }

    get askRational() {
        if (this._ask)
            return this._ask
    }

    get askQualityRational() {
        if (this._askQuality)
            return this._askQuality
    }

    toLogObject() {
        let x: any = {}
        if (this._bid)
            x.bid = this._bid.toDecimal(15)
        if (this._bidQuality)
            x.bidQuality = this._bidQuality.toDecimal(15)
        if (this._ask)
            x.ask = this._ask.toDecimal(15)
        if (this._askQuality)
            x.askQuality = this._askQuality.toDecimal(15)
        return {spread: x}
    }

    toJSON() {
        return {
            bid: this._bid?.toString(),
            ask: this._ask?.toString(),
            bidQuality: this._bidQuality?.toString(),
            askQuality: this._askQuality?.toString()
        }
    }

    static fromJSON(json: any): Spread {
        let spread = new Spread()
        spread._bid = json.bid ? Rational(json.bid) : undefined
        spread._ask = json.ask ? Rational(json.ask) : undefined
        spread._bidQuality = json.bidQuality ? Rational(json.bidQuality) : undefined
        spread._askQuality = json.askQuality ? Rational(json.askQuality) : undefined
        return spread
    }
}
