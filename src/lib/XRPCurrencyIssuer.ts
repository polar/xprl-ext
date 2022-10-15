import {CurrencyIssuer} from "./CurrencyIssuer";
import {Currency} from "xrpl/dist/npm/models/common";
import {Rational, RationalNumber} from "./Rational";


export class XRPCurrencyIssuer implements CurrencyIssuer {
    currency: string
    defaultPrecision: number;

    get internalCurrency(): string {
        return "XRP"
    }

    constructor() {
        this.currency = "XRP"
        this.defaultPrecision = 1e6
    }

    get booking(): Currency {
        return {currency: "XRP"};
    }

    amount(amount: number | string | RationalNumber, precision = 1e6) {
        return this.normalizeCurrencyAmount(amount, precision)
    }

    xrpToDrops(amount: number | string | RationalNumber) {
        return this.normalizeCurrencyAmount(Rational(amount).times(1e6))
    }

    get address(): string | undefined {
        return undefined;
    }

    normalizeCurrencyAmount(amount: number | string | RationalNumber, precision?: number): string {
        return Rational(amount).toDecimal(0);
    }
}
