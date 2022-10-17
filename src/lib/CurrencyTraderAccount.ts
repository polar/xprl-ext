import {Account} from "./Account";
import {BookOffersResponse, Client, SubmitResponse, Transaction, TxResponse} from "xrpl";
import {CurrencyIssuer} from "./CurrencyIssuer";
import {CurrencyTrader} from "./CurrencyTrader";
import {PassiveAccountI} from "./PassiveAccountI";
import {Spread} from "./Spread";
import {Rational, RationalNumber} from "./Rational";
import {CurrencyTraderPassiveAccount} from "./CurrencyTraderPassiveAccount";
import {TraderAccountProps} from "./TraderAccountProps";

function roundToPrecision(amt: number, prec: number = 1e6) {
    return Math.round(amt * prec) / prec
}

export class CurrencyTraderAccount extends Account implements CurrencyTrader {

    currencyIssuer: CurrencyIssuer


    constructor(props: TraderAccountProps) {
        super(props)
        this.currencyIssuer = props.currencyIssuer
    }

    init(api?: Client) {
        return super.init(api)
    }

    offerAmount(amount: number | string | RationalNumber) {
        return this.currencyIssuer.amount(amount)
    }

    txBid(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string) {
        return this.txFactory.txOffer(
            this.wallet.address,
            this.offerAmount(amount),       // Taker gets, I pay
            Rational(drops).toDecimal(0), // Taker pays, I get
            flags,
            fee)
    }

    txAsk(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string) {
        return this.txFactory.txOffer(
            this.wallet.address,
            Rational(drops).toDecimal(0), // Taker gets, I pay
            this.offerAmount(amount),       // Taker pays, I get
            flags,
            fee)
    }

    txAsk666(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string) {
        return this.txFactory.txOffer(
            this.wallet.address,
            Rational(drops).toDecimal(0), // Taker gets, I pay
            this.offerAmount(amount),       // Taker pays, I get
            flags,
            fee)
    }

    txBid777(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string) {
        return this.txFactory.txOffer(
            this.wallet.address,
            this.offerAmount(amount),       // Taker gets, I pay
            Rational(drops).toDecimal(0), // Taker pays, I get
            flags,
            fee)
    }

    async getCurrentSpread() {
        let bids = await this.getBids()
        let asks = await this.getAsks()
        let spread = new Spread()
        spread.set(bids.result.offers[0])
        spread.set(asks.result.offers[0])
        return spread
    }

    submitTradingTrustLine(limit: number | string | RationalNumber, enableRipple: boolean, fee?: string): Promise<SubmitResponse> {
        let lim = this.currencyIssuer.normalizeCurrencyAmount(limit)
        return this.submitTrustSet(this.currencyIssuer.address!, this.currencyIssuer.internalCurrency, lim, enableRipple, fee)
    }

    submitTradingTrustLineAndWait(limit: number, enableRipple: boolean, fee?: string): Promise<TxResponse> {
        let lim = this.currencyIssuer.normalizeCurrencyAmount(limit)
        return this.submitTrustSetAndWait(this.currencyIssuer.address!, this.currencyIssuer.internalCurrency, lim, enableRipple, fee)
    }

    submitTradingTrustLineAndWait3(limit: number, enableRipple: boolean, fee?: string): Promise<TxResponse> {
        let lim = this.currencyIssuer.normalizeCurrencyAmount(limit)
        return this.submitTrustSetAndWait3(this.currencyIssuer.address!, this.currencyIssuer.internalCurrency, lim, enableRipple, fee)
    }


    submitAsk(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<SubmitResponse> {
        return this.txAsk666(drops, amount, flags, fee)
            .then(tx => this.submitTransaction(tx))
    }

    submitAskAndWait(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse> {
        return this.txAsk666(drops, amount, flags, fee)
            .then(tx => this.submitTransactionAndWait(tx))
    }

    submitAskAndWait3(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse> {
        return this.txAsk666(drops, amount, flags, fee)
            .then(tx => this.submitTransactionAndWait3(tx))
    }

    submitBid(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<SubmitResponse> {
        return this.txBid777(drops, amount, flags, fee)
            .then(tx => this.submitTransaction(tx))
    }

    submitBidAndWait(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse> {
        return this.txBid777(drops, amount, flags, fee)
            .then(tx => this.submitTransactionAndWait(tx))
    }

    submitBidAndWait3(drops: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse> {
        return this.txBid777(drops, amount, flags, fee)
            .then(tx => this.submitTransactionAndWait3(tx))
    }

    getBids(): Promise<BookOffersResponse> {
        return this.api!.request({
            command: "book_offers",
            taker_pays: {currency: "XRP"},
            taker_gets: {currency: this.currencyIssuer.internalCurrency, issuer: this.currencyIssuer.address!}
        })
    }

    getAsks(): Promise<BookOffersResponse> {
        return this.api!.request({
            command: "book_offers",
            taker_gets: {currency: "XRP"},
            taker_pays: {currency: this.currencyIssuer.internalCurrency, issuer: this.currencyIssuer.address!}
        })
    }

    submitCancelAllAsks(fee?: string): Promise<SubmitResponse[]> {
        let self = this
        return this.getAsks()
            .then(bookResp => bookResp.result.offers)
            .then(offers => offers.filter(offer => offer.Account === self.wallet.address))
            .then(offers => {
                let ps = offers.map(offer => self.txCancelOffer(offer.Sequence, fee))
                return Promise.all(ps)
                    .then(txs => self.submitSequence(txs))
            })
    }

    submitCancelAllAsksAndWait(fee?: string): Promise<TxResponse[]> {
        let self = this
        return this.getAsks()
            .then(bookResp => bookResp.result.offers)
            .then(res => self.log(res))
            .then(offers => offers.filter(offer => offer.Account === self.wallet.address))
            .then(offers => {
                let ps = offers.map(offer => self.txCancelOffer(offer.Sequence, fee))
                return Promise.all(ps)
                    .then(txs => self.submitSequenceAndWait(txs))
            })
    }

    submitCancelAllAsksAndWait3(fee?: string): Promise<TxResponse[]> {
        let self = this
        return this.getAsks()
            .then(bookResp => bookResp.result.offers)
            .then(res => self.log(res))
            .then(offers => offers.filter(offer => offer.Account === self.wallet.address))
            .then(offers => {
                let ps = offers.map(offer => self.txCancelOffer(offer.Sequence, fee))
                return Promise.all(ps)
                    .then(txs => self.submitSequenceAndWait3(txs))
            })
    }

    submitCancelAllBids(fee?: string): Promise<SubmitResponse[]> {
        let self = this
        return this.getBids()
            .then(bookResp => bookResp.result.offers)
            .then(offers => offers.filter(offer => offer.Account === self.wallet.address))
            .then(offers => {
                let ps = offers.map(offer => self.txCancelOffer(offer.Sequence, fee))
                return Promise.all(ps)
                    .then(txs => self.submitSequence(txs))
            })
    }

    submitCancelAllBidsAndWait(fee?: string): Promise<TxResponse[]> {
        let self = this
        return this.getBids()
            .then(bookResp => bookResp.result.offers)
            .then(offers => offers.filter(offer => offer.Account === self.wallet.address))
            .then(offers => {
                let ps = offers.map(offer => self.txCancelOffer(offer.Sequence, fee))
                return Promise.all(ps)
                    .then(txs => self.submitSequenceAndWait(txs))
            })
    }

    submitCancelAllBidsAndWait3(fee?: string): Promise<TxResponse[]> {
        let self = this
        return this.getBids()
            .then(bookResp => bookResp.result.offers)
            .then(offers => offers.filter(offer => offer.Account === self.wallet.address))
            .then(offers => {
                let ps = offers.map(offer => self.txCancelOffer(offer.Sequence, fee))
                return Promise.all(ps)
                    .then(txs => self.submitSequenceAndWait3(txs))
            })
    }

    nextSequence() {
        return this.sequencer.useNext();
    }

    submitCurPayment(dest: PassiveAccountI | string, amount: number | string | RationalNumber, dest_tag?: number, fee?: string) {
        return this.submitPayment(dest, this.offerAmount(amount), dest_tag, fee)
    }

    submitCurPaymentAndWait(dest: PassiveAccountI | string, amount: number | string | RationalNumber, dest_tag?: number, fee?: string) {
        return this.submitPaymentAndWait(dest, this.offerAmount(amount), dest_tag, fee)
    }

    submitCurPaymentAndWait3(dest: PassiveAccountI | string, amount: number | string | RationalNumber, dest_tag?: number, fee?: string) {
        return this.submitPaymentAndWait3(dest, this.offerAmount(amount), dest_tag, fee)
    }

    async getOfferCreates(): Promise<Transaction[]> {
        return await CurrencyTraderPassiveAccount.getOfferCreatesFromCurrencyTrader(this)
    }

    async getOfferCreateMetas() {
        return await CurrencyTraderPassiveAccount.getOfferCreateMetasFromCurrencyTrader(this)
    }
}
