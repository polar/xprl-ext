import {AccountLinesResponse, BookOffersResponse, Client, Wallet} from "xrpl";
import {AccountSequencer} from "./AccountSequencer";
import {TransactionFactory} from "./TransactionFactory";
import {CurrencyIssuer} from "./CurrencyIssuer";
import {BookOrders} from "./PassiveAccount";
import {Rational, RationalNumber} from "./Rational"

/**
 * This interface just holds the XRP currency attribute.
 */
interface XRPCurrency {
    currency: 'XRP';
}

/**
 * This interface explains the currency and the issuer in string form.
 */
export interface IssuedCurrency {
    currency: string;
    issuer: string;
}

export declare type Currency = IssuedCurrency | XRPCurrency;

/**
 * This interface represents an amount of a particular currency and issuer.
 */
export interface IssuedCurrencyAmount extends IssuedCurrency {
    value: string;
}

/**
 * This type explains a balance for a particular currency or XRP.
 */
export interface Balance {
    value: string
    currency: string
    issuer?: string
}

export type AccountBalancesX = {
    name: string,
    address: string,
    balances: Balance[]
}

/**
 * This class represents a Balance for a particular currency.
 */
export class BalanceClass implements Balance {
    balance: Balance

    /**
     * This function decodes a string. If the currency has more than 3
     * characters it is encoded in ascii codes.
     * @param cur
     */
    static decodeInternalCurrency(cur: string) {
        if (cur.length > 3) {
            let alias = ''
            for (let i = 0; i < cur.length; i += 2) {
                let x = parseInt(cur.substr(i, 2), 16)
                if (x == 0)
                    break
                alias += String.fromCharCode(x)
            }
            return alias
        }
        return cur
    }

    constructor(balance: Balance) {
        this.balance = balance;
    }

    get alias() {
        return BalanceClass.decodeInternalCurrency(this.balance.currency)
    }

    get currency() {
        return this.balance.currency
    }

    get issuer() {
        return this.balance.issuer
    }

    get value() {
        return this.balance.value
    }

    toJSON() {
        return {
            alias: this.alias,
            ...this.balance
        }
    }
}

/**
 * This class represents a set of account balances in all currencies, perhaps associated
 * with a single account.
 */
export class AccountBalances {
    name: string
    address: string
    balances: Balance[]

    constructor(name: string, address: string, balances: Balance[]) {
        this.name = name
        this.address = address
        this.balances = balances
    }

    /**
     * This method extracts the balance for the specific issuer.
     * Ex. GateHub USD, BitStamp USD, etc.
     * @param issuer
     */
    getBalance(issuer: CurrencyIssuer): number {
        let bal = this.balances.find((bal: Balance) => (bal.currency == issuer.internalCurrency && bal.issuer == issuer.address))
        if (bal !== undefined) {
            return Number(issuer.normalizeCurrencyAmount(bal.value))
        }
        return 0
    }

    /**
     * This method extracts the balance of a particular currency and issuer in
     * rational form.
     * @param issuer
     */
    getRationalBalance(issuer: CurrencyIssuer) {
        let bal = this.balances.find((bal: Balance) => (bal.currency == issuer.internalCurrency && bal.issuer == issuer.address))
        if (bal !== undefined) {
            return Rational(bal.value)
        }
        return RationalNumber.zero
    }

    /**
     * This method names the account, its address, and the balances.
     */
    toJSON() {
        return {name: this.name, address: this.address, balances: this.balances}
    }

    toString() {
        return JSON.stringify(this.toJSON())
    }

    toLogObject() {
        return {
            name: this.name,
            address: this.address,
            balances: this.balances.map(x => new BalanceClass(x).toJSON())
        }
    }

    static fromJSON(balances: any): AccountBalances {
        return new AccountBalances(balances.name, balances.address, balances.balances)
    }
}

/**
 * This type represents the TrustLines associated with an account.
 */
export type AccountTrustLines = {
    name: string,
    address: string,
    trustLines: AccountLinesResponse
}

/**
 * This type explains a PassiveAccount's functionality.
 */
export interface PassiveAccountI {
    api?: Client
    name: string
    tag?: number
    wallet: Wallet
    sequencer: AccountSequencer
    txFactory: TransactionFactory

    /**
     * This value is the address of this account's wallet.
     */
    get address(): string

    /**
     * This method retrieves the balances that belongs to this account.
     */
    getBalances(): Promise<Balance[]>

    /**
     * This method retrieves the balances that belongs to this account.
     * It labels them so that the JSON may be easily logged in a human readable format.
     */
    getLabeledBalances(): Promise<AccountBalances>

    /**
     * This method gets the balance of a particular currency.
     * @param currency
     */
    getBalance(currency: CurrencyIssuer): Promise<Balance>


    /**
     * This method retrieves the current trust lines associated with this account.
     */
    getTrustLines(): Promise<AccountLinesResponse>

    /**
     * This method retrieves the current trust lines associated with this account.
     * The return labels the trust lines so that it may be logged in a human-readable format.
     */
    getLabeledTrustLines(): Promise<AccountTrustLines>

    /**
     * This method retrieves the OrderBooks for this account and currencies.
     * @param in_cur
     * @param out_cur
     */
    getOrderBooks(in_cur: CurrencyIssuer, out_cur: CurrencyIssuer): Promise<BookOffersResponse>

    /**
     * This method extracts the OrderBooks as BookOrders for this particular account and currencies.
     * @param cur1
     * @param cur2
     */
    getAskBidOrderBooks(cur1: CurrencyIssuer, cur2: CurrencyIssuer): Promise<BookOrders>
}
