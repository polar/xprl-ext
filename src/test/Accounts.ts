import {Account} from "../lib/Account";
import {blandWallet, coldWallet, hotWallet, redWallet} from "./Creds";
import {CurrencyIssuerAccount} from "../lib/CurrencyIssuerAccount";
import {CurrencyTraderAccount} from "../lib/CurrencyTraderAccount";


export const coldAccount = new Account( {
    tag: 1,
    wallet: coldWallet,
    name: "cold"
})

export const currencyIssuer = new CurrencyIssuerAccount( {
    tag: 1,
    wallet: blandWallet,
    name: "currencyIssuer",
    currency: "USD"
})

export const hotAccount = new Account( {
    tag: 2,
    wallet: hotWallet,
    name: "hot"
})

export const hotTrader = new CurrencyTraderAccount( {
    tag: 2,
    wallet: hotWallet,
    name: "hotTrader",
    currencyIssuer: currencyIssuer
})
export const coldTrader = new CurrencyTraderAccount( {
    tag: 2,
    wallet: coldWallet,
    name: "coldTrader",
    currencyIssuer: currencyIssuer
})

export const redAccount = new Account( {
    tag: 3,
    wallet: redWallet,
    name: "red"
})

export const redTrader = new CurrencyTraderAccount( {
    tag: 2,
    wallet: redWallet,
    name: "redTrader",
    currencyIssuer: currencyIssuer
})

export const blandAccount = new Account( {
    tag: 4,
    wallet: blandWallet,
    name: "bland"
})
