import {BookOffer} from "xrpl/dist/npm/models/methods/bookOffers";
import {OfferCreate, OfferCreateFlags} from "xrpl";
import {IssuedCurrencyAmount} from "./PassiveAccountI";
import {sprintf} from "sprintf-js";
import {Rational, RationalNumber} from "./Rational";

export type OfferCrossResult = {
    type: string,
    xrpGain: RationalNumber,
    curGain: RationalNumber,
    modify?: { pays: RationalNumber, gets: RationalNumber }
}

export type CrossResponse = {
    this: OfferCrossResult,
    other: OfferCrossResult
}

export class OfferCrossResultWrapper {
    resp?: OfferCrossResult

    constructor(resp: OfferCrossResult) {
        this.resp = resp
    }

    toModifyLogObject(modify?: any) {
        if (modify)
            return {
                pays: this.resp!.type == "sell" ? modify.pays.toDecimal(6) + " XRP" : modify.pays.toDecimal(15),
                gets: this.resp!.type == "sell" ? modify.gets.toDecimal(15) : modify.gets.toDecimal(6) + " XRP"
            }
    }

    toLogObject() {
        if (this.resp) {
            return {
                xrpGain: this.resp.xrpGain.toDecimal(6),
                curGain: this.resp.curGain.toDecimal(15),
                modify: this.toModifyLogObject(this.resp.modify)
            }
        } else {
            return {
                type: this.resp
            }
        }
    }
}

export class CrossResponseWrapper {
    resp?: CrossResponse

    constructor(resp: CrossResponse | undefined) {
        this.resp = resp
    }

    toLogObject() {
        if (this.resp) {
            return {
                this: new OfferCrossResultWrapper(this.resp.this).toLogObject(),
                other: new OfferCrossResultWrapper(this.resp.other).toLogObject()
            }
        } else {
            return {
                NO_CROSS: "NO_CROSS"
            }
        }
    }
}

function XRP(rat: number | any) {
    if (typeof rat == "number") {
        return Rational(rat).times(1e6).round(false).divide(1e6)
    } else {
        return rat.times(1e6).round(false).divide(1e6)
    }
}

function CUR(rat: number | any) {
    if (typeof rat == "number") {
        return Rational(rat).times(1e12).round(false).divide(1e12)
    } else {
        return rat.times(1e12).round(false).divide(1e12)
    }
}

/**
 * This class wraps an OfferCreate transaction or result so that we may use
 * a common interface to refer to its parts. Also, it serves to create
 * human-readable JSON for logging.
 */
export class OfferWrapper {
    offer: OfferCreate | BookOffer

    constructor(offer: OfferCreate | BookOffer) {
        this.offer = offer
    }

    get type() {
        return typeof this.offer.TakerPays === "string" ? "buy" : "sell"
    }

    get sequence() {
        return this.offer.Sequence
    }

    get pays() {
        return this.type === "buy"
            ? Rational(this.offer.TakerPays as string, 1e6)
            : Rational((this.offer.TakerPays as IssuedCurrencyAmount).value)
    }

    get gets() {
        return this.type === "sell"
            ? Rational(this.offer.TakerGets as string, 1e6)
            : Rational((this.offer.TakerGets as IssuedCurrencyAmount).value)
    }

    get ratio() {
        return this.type === "buy"
            ? this.gets.divide(this.pays)
            : this.pays.divide(this.gets)
    }

    get quality() {
        return this.type === "sell"
            ? this.gets.times(1e6).divide(this.pays)
            : this.pays.divide(this.gets.times(1e6))
    }

    get crossQuality() {
        return RationalNumber.one.divide(this.quality)
    }

    toLogObject() {
        return {
            type: this.type,
            sequence: this.sequence,
            pays: this.type === "buy" ? this.pays.toDecimal(6) : this.pays.toDecimal(15),
            gets: this.type === "sell" ? this.gets.toDecimal(6) : this.gets.toDecimal(15),
            ratio: this.ratio.toDecimal(15),
            quality: this.quality.toDecimal(15),
            crossQuality: this.crossQuality.toDecimal(15)
        }
    }

    toString() {
        let f = this.type == "buy"
            ? "type: %4s pays:  %25.15f gets: $%22.15f ratio: %25.15f qal: %25.15f"
            : "type: %4s pays: $%25.15f gets:  %22.15f ratio: %25.15f qal: %25.15f"
        return sprintf(f,
            this.type,
            this.pays.valueOf(),
            this.gets.valueOf(),
            this.ratio.valueOf(),
            this.quality.valueOf()
        )
    }


    /**
     * Cross this object with another offer.
     * @returns A CrossResponse structure if the offer will cross. This structure
     *          contains two objects, one for "this" offer (this object), and
     *          the "other" offer (this method's parameter). Each object will
     *          contain the xrp and currency gains and an optional "modify" object,
     *          and the type (buy,sell) of the offer.
     *          If an offer will not be totally consumed, the "modify"
     *          object will contain "pays" and "gets" for the modified offer.
     *          All numbers are Big Rationals.
     * @param other The other wrapped offer
     * @param flags  OfferCreateFlags
     *               Note: tfImmediateOrCancel and tfFillOrKill flags are mutually exclusive, not checked
     *               tfSell is NOT IMPLEMENTED, not checked.
     */
    cross(other: OfferWrapper, flags: OfferCreateFlags): CrossResponse | undefined {
        if (this.type == "sell") {
            if (other.type == "buy") {
                return this.crossWithBuy(other, flags)
            }
        } else {
            if (other.type == "sell") {
                return this.crossWithSell(other, flags)
            }
        }
    }


    private crossWithSell(other: OfferWrapper, flags: OfferCreateFlags): CrossResponse | undefined {
        let willCross = 0 !== (flags & OfferCreateFlags.tfPassive)
            ? other.ratio.lt(this.ratio)
            : other.ratio.leq(this.ratio)
        if (willCross) {
            let xrp = [other.gets, this.pays].reduce((a, c) => c.lt(a) ? c : a) // Min
            let cur = xrp.times(this.ratio)
            cur = [other.pays, this.gets, cur].reduce((a, c) => c.lt(a) ? c : a) // Min
            let partialXrp = cur.divide(this.ratio)
            let ret = this.crossSellReturn(partialXrp, cur, other)
            // These tfImmediateOrCancel and tfFillOrKill flags are mutually exclusive
            if (0 !== (flags & OfferCreateFlags.tfImmediateOrCancel)) {
                delete ret.other.modify
            }
            if (0 !== (flags & OfferCreateFlags.tfFillOrKill)) {
                if (ret.other.modify !== undefined) {
                    return
                }
            }
            return ret
        } else {
            // No Cross
        }
    }

    private crossWithBuy(other: OfferWrapper, flags: OfferCreateFlags): CrossResponse | undefined {
        let willCross = 0 !== (flags & OfferCreateFlags.tfPassive)
            ? other.ratio.gt(this.ratio)
            : other.ratio.geq(this.ratio)
        if (willCross) {
            let cur = [other.gets, this.pays].reduce((a, c) => c.lt(a) ? c : a) // Min
            let xrp = cur.divide(this.ratio)
            xrp = [other.pays, this.gets, xrp].reduce((a, c) => c.lt(a) ? c : a) // Min
            let partialCur = xrp.times(this.ratio)
            let ret = this.crossBuyReturn(xrp, partialCur, other)
            // These tfImmediateOrCancel and tfFillOrKill flags are mutually exclusive
            if (0 !== (flags & OfferCreateFlags.tfImmediateOrCancel)) {
                delete ret.other.modify
            }
            if (0 !== (flags & OfferCreateFlags.tfFillOrKill)) {
                if (ret.other.modify !== undefined) {
                    return
                }
            }
            return ret
        } else {
            // No Cross
        }

    }

    private crossBuyReturn(xrp: RationalNumber, cur: RationalNumber, other: OfferWrapper) {
        let modifyThis: any
        if (Math.round(this.pays.subtract(cur).valueOf()) > 0 && Math.round(this.gets.subtract(xrp).times(1e6).valueOf()) > 0) {
            modifyThis = {
                pays: CUR(this.pays.subtract(cur)),
                gets: XRP(this.gets.subtract(xrp))
            }
        }
        let modifyOther: any
        if (Math.round(other.pays.subtract(xrp).times(1e6).valueOf()) > 0 && Math.round(other.gets.subtract(cur).valueOf()) > 0) {
            modifyOther = {
                pays: XRP(other.pays.subtract(xrp)),
                gets: CUR(other.gets.subtract(cur))
            }
        }
        return {
            this: {
                type: this.type,
                xrpGain: XRP(RationalNumber.zero.subtract(xrp)),
                curGain: CUR(cur),
                modify: modifyThis
            },
            other: {
                type: other.type,
                xrpGain: XRP(xrp),
                curGain: CUR(RationalNumber.zero.subtract(cur)),
                modify: modifyOther
            }
        }
    }

    private crossSellReturn(xrp: any, cur: any, other: OfferWrapper) {
        let modifyThis: any
        if (Math.round(this.gets.subtract(cur).valueOf()) > 0 && Math.round(this.pays.subtract(xrp).times(1e6).valueOf()) > 0) {
            modifyThis = {
                pays: XRP(this.pays.subtract(xrp)),
                gets: CUR(this.gets.subtract(cur))
            }
        }
        let modifyOther: any
        if (Math.round(other.pays.subtract(cur).valueOf()) > 0 && Math.round(other.gets.subtract(xrp).times(1e6).valueOf()) > 0) {
            modifyOther = {
                pays: CUR(other.pays.subtract(cur)),
                gets: XRP(other.gets.subtract(xrp))
            }
        }
        return {
            this: {
                type: this.type,
                curGain: CUR(RationalNumber.zero.subtract(cur)),
                xrpGain: XRP(xrp),
                modify: modifyThis
            },
            other: {
                type: other.type,
                curGain: CUR(cur),
                xrpGain: XRP(RationalNumber.zero.subtract(xrp)),
                modify: modifyOther
            }
        }
    }
}
