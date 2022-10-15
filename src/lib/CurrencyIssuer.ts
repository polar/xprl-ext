import {Amount, Currency} from "xrpl/dist/npm/models/common";
import {TakerAmount} from "xrpl/dist/npm/models/methods/bookOffers";
import {RationalNumber} from "./Rational";


export interface CurrencyIssuer {
    currency: string
    defaultPrecision: number

    get internalCurrency(): string

    get address(): string | undefined

    amount(amt: number | string | RationalNumber): Amount

    normalizeCurrencyAmount(amount: number | string | RationalNumber, precision?: number): string

    get booking(): Currency | TakerAmount
}

