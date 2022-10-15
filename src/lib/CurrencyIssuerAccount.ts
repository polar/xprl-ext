import {Account} from "./Account";
import {CurrencyIssuerAccountProps} from "./CurrencyIssuerAccountProps";
import {CurrencyIssuer} from "./CurrencyIssuer";
import {CurrencyIssuerPassiveAccount} from "./CurrencyIssuerPassiveAccount";
import {Amount, IssuedCurrencyAmount} from "xrpl/dist/npm/models/common";

import {Rational, RationalNumber} from "./Rational"

export class CurrencyIssuerAccount extends Account implements CurrencyIssuer {
    currency: string
    defaultPrecision: number
    _internalCurrency: string

    get internalCurrency() {
        return this._internalCurrency
    }

    constructor(props: CurrencyIssuerAccountProps) {
        super(props)
        this.currency = props.currency
        this.defaultPrecision = props.defaultPrecision || 1e12
        this._internalCurrency = CurrencyIssuerPassiveAccount.constructInternalCurrency(this.currency)
    }

    get booking() {
        return {currency: this.internalCurrency, issuer: this.address};
    }

    normalizeCurrencyAmount(amount: number | string | RationalNumber, precision?: number): string {
        let amt = Rational(amount).toDecimal(Math.log10(precision !== undefined ? precision : this.defaultPrecision))
        // Need to get rid of trailing zeros and decimal point if needed.
        let num = amt.replace(/(\.[0-9]*[1-9]+)0*/, "$1").replace(/\.0+($|e)/, "$1")
        // It cannot be over 16 digits
        if ((num.match(/\./) && num.length > 17)) {
            num = num.slice(0, 17)
        } else {
            num = num.slice(0, 16)
        }
        // Need to do this again in case we stripped off numbers to a trailing zero
        num = num.replace(/(\.[0-9]*[1-9]+)0*/, "$1").replace(/\.0+($|e)/, "$1")
        return num
    }

    private offerAmount(amount: number | string | RationalNumber, precision?: number): IssuedCurrencyAmount {
        let amt = this.normalizeCurrencyAmount(amount, precision)
        return {
            currency: this.internalCurrency,
            issuer: this.address!,
            value: amt
        }
    }

    amount(amount: number | string | RationalNumber): Amount {
        return this.offerAmount(amount)
    }

    get address() {
        return this.wallet.address
    }
}
