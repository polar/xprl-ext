import {CurrencyIssuer} from "./CurrencyIssuer";
import {BookOffersResponse, SubmitResponse, TxResponse} from "xrpl";
import {AccountI} from "./AccountI";
import {Account} from "./Account";
import {AccountProps} from "./AccountProps";

export interface CrossCurrencyTrader extends AccountI {
    currencyEast: CurrencyIssuer
    currencyWest: CurrencyIssuer

    submitEastwardOffer(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<SubmitResponse>

    submitEastwardOfferAndWait(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse>

    submitEastwardOfferAndWait3(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse>

    submitWestwardOffer(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<SubmitResponse>

    submitWestwardOfferAndWait(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse>

    submitWestwardOfferAndWait3(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse>

    getEastwardBookOffers(): Promise<BookOffersResponse>

    getWestwardBookOffers(): Promise<BookOffersResponse>
}

export interface CrossCurrencyTraderAccountProps extends AccountProps {
    currencyEast: CurrencyIssuer
    currencyWest: CurrencyIssuer
}

export class CrossCurrencyTraderAccount extends Account implements CrossCurrencyTrader {
    currencyEast: CurrencyIssuer
    currencyWest: CurrencyIssuer

    constructor(props: CrossCurrencyTraderAccountProps) {
        super(props);
        this.currencyWest = props.currencyWest
        this.currencyEast = props.currencyEast
    }

    getEastwardBookOffers(): Promise<BookOffersResponse> {
        return this.api!.request({
            command: "book_offers",
            taker_gets: {currency: this.currencyWest.currency, issuer: this.currencyWest.address!},
            taker_pays: {currency: this.currencyEast.currency, issuer: this.currencyEast.address!}
        })
    }

    getWestwardBookOffers(): Promise<BookOffersResponse> {
        return this.api!.request({
            command: "book_offers",
            taker_gets: {currency: this.currencyEast.currency, issuer: this.currencyEast.address!},
            taker_pays: {currency: this.currencyWest.currency, issuer: this.currencyWest.address!}
        })
    }

    submitEastwardOffer(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<SubmitResponse> {
        return this.submitOffer(
            this.currencyWest.amount(in_amt),
            this.currencyEast.amount(out_amt), flags, fee)
    }

    submitEastwardOfferAndWait(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse> {
        return this.submitOfferAndWait(
            this.currencyWest.amount(in_amt),
            this.currencyEast.amount(out_amt), flags, fee)
    }

    submitEastwardOfferAndWait3(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse> {
        return this.submitOfferAndWait3(
            this.currencyWest.amount(in_amt),
            this.currencyEast.amount(out_amt), flags, fee)
    }

    submitWestwardOffer(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<SubmitResponse> {
        return this.submitOffer(
            this.currencyEast.amount(in_amt),
            this.currencyWest.amount(out_amt), flags, fee)
    }

    submitWestwardOfferAndWait(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse> {
        return this.submitOfferAndWait(
            this.currencyEast.amount(in_amt),
            this.currencyWest.amount(out_amt), flags, fee)
    }

    submitWestwardOfferAndWait3(in_amt: number, out_amt: number, flags?: number, fee?: string): Promise<TxResponse> {
        return this.submitOfferAndWait3(
            this.currencyEast.amount(in_amt),
            this.currencyWest.amount(out_amt), flags, fee)
    }

}
