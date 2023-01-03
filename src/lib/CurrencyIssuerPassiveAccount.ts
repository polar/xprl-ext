import {PassiveAccount} from "./PassiveAccount";
import {CurrencyIssuer} from "./CurrencyIssuer";
import {CurrencyIssuerAccountProps} from "./CurrencyIssuerAccountProps";
import {Amount, IssuedCurrencyAmount} from "xrpl/dist/npm/models/common";
import {Rational, RationalNumber} from "rational"

export class CurrencyIssuerPassiveAccount extends PassiveAccount implements CurrencyIssuer {
    currency: string
    defaultPrecision: number
    _internalCurrency: string

    normalizeCurrencyAmount(amount: number | string | RationalNumber, precision?: number): string {
        let amt = Rational(amount).toDecimal(Math.log10(precision !== undefined ? precision : this.defaultPrecision))
        // Need to get rid of trailing zeros and decimal point if needed.
        return amt.replace(/(\.[0-9]*[1-9]+)0*/, "$1").replace(/\.0+($|e)/, "$1")
    }

    private offerAmount(amount: number | string | RationalNumber, precision?: number): IssuedCurrencyAmount {
        let amt = this.normalizeCurrencyAmount(amount, precision)
        return {
            currency: this.internalCurrency,
            issuer: this.address!,
            value: amt
        }
    }

    static constructInternalCurrency(currency: string) {
        let expanded = Array(20).fill("00")
        if (currency.length > 3) {
            for (let i = 0; i < currency.length; i++) {
                expanded[i] = `${currency.charCodeAt(i).toString(16).toUpperCase()}`
            }
            return expanded.join("")
        } else {
            return currency
        }
    }


    constructor(props: CurrencyIssuerAccountProps) {
        super(props)
        this.currency = props.currency
        this.defaultPrecision = props.defaultPrecision || 1e6
        this._internalCurrency = CurrencyIssuerPassiveAccount.constructInternalCurrency(this.currency)
    }


    get internalCurrency() {
        return this._internalCurrency
    }

    amount(amount: number | string | RationalNumber): Amount {
        return this.offerAmount(amount)
    }

    get booking() {
        return {currency: this.internalCurrency, issuer: this.address};
    }


}
