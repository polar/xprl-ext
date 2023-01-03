import {BookOffersResponse, SubmitResponse, TxResponse} from "xrpl";
import {AccountI} from "./AccountI";
import {PassiveAccountI} from "./PassiveAccountI";
import {RationalNumber} from "rational";
import {CurrencyIssuer} from "./CurrencyIssuer";

export interface CurrencyTraderPassive extends PassiveAccountI {
    getAsks(): Promise<BookOffersResponse>


    getBids(): Promise<BookOffersResponse>
}

export interface CurrencyTrader extends AccountI {
    currencyIssuer: CurrencyIssuer;

    submitTradingTrustLine(limit: number | string | RationalNumber, enableRipple: boolean, fee?: string): Promise<SubmitResponse>

    submitTradingTrustLineAndWait(limit: number | string | RationalNumber, enableRipple: boolean, fee?: string): Promise<TxResponse>

    submitTradingTrustLineAndWait3(limit: number | string | RationalNumber, enableRipple: boolean, fee?: string): Promise<TxResponse>


    submitAsk(xrp: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<SubmitResponse>

    submitAskAndWait(xrp: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse>

    submitAskAndWait3(xrp: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse>

    submitBid(xrp: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<SubmitResponse>

    submitBidAndWait(xrp: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse>

    submitBidAndWait3(xrp: number | string | RationalNumber, amount: number | string | RationalNumber, flags?: number, fee?: string): Promise<TxResponse>

    getAsks(): Promise<BookOffersResponse>


    getBids(): Promise<BookOffersResponse>

}
