import {BookOffersResponse, Client, Transaction, TransactionAndMetadata, TransactionMetadata} from "xrpl";
import {CurrencyIssuer} from "./CurrencyIssuer";
import {CurrencyTraderPassive} from "./CurrencyTrader";
import {PassiveAccount} from "./PassiveAccount";
import {Spread} from "./Spread";
import {TraderAccountProps} from "./TraderAccountProps";
import {IssuedCurrencyAmount} from "xrpl/dist/npm/models/common";
import {CurrencyTraderAccount} from "./CurrencyTraderAccount";


export class CurrencyTraderPassiveAccount extends PassiveAccount implements CurrencyTraderPassive {
    currencyIssuer: CurrencyIssuer

    constructor(props: TraderAccountProps) {
        super(props)
        this.currencyIssuer = props.currencyIssuer
    }

    init(api?: Client) {
        return super.init(api)
    }


    getAsks(): Promise<BookOffersResponse> {
        return this.api!.request({
            command: "book_offers",
            taker_gets: {currency: "XRP"},
            taker_pays: {currency: this.currencyIssuer.internalCurrency, issuer: this.currencyIssuer.address!}
        })
    }

    getBids(): Promise<BookOffersResponse> {
        return this.api!.request({
            command: "book_offers",
            taker_gets: {currency: this.currencyIssuer.internalCurrency, issuer: this.currencyIssuer.address!},
            taker_pays: {currency: "XRP"}
        })
    }

    async getCurrentSpread() {
        let bids = await this.getBids()
        let asks = await this.getAsks()
        let spread = new Spread()
        spread.set(bids.result.offers[0])
        spread.set(asks.result.offers[0])
        return spread
    }

    async getOfferCreates() {
        return CurrencyTraderPassiveAccount.getOfferCreatesFromCurrencyTrader(this)
    }

    static async getOfferCreateMetasFromCurrencyTrader(account: CurrencyTraderPassiveAccount | CurrencyTraderAccount) {
        let offers: TransactionAndMetadata[] = []
        let response = await account.api!.request({
            command: "account_tx",
            account: account.address,
        })
        while (response.result.transactions.length > 0) {
            let offerCreates = response.result.transactions.filter(t => t.tx?.TransactionType === "OfferCreate" &&
                ((t.tx?.TakerGets as IssuedCurrencyAmount)?.currency === account.currencyIssuer.internalCurrency ||
                    (t.tx?.TakerPays as IssuedCurrencyAmount)?.currency === account.currencyIssuer.internalCurrency
                )).map(x => ({transaction: x.tx!, metadata: x.meta! as TransactionMetadata}))
            offers = offers.concat(offerCreates)
            if (response.result.marker) {
                response = await account.api!.request({
                    command: "account_tx",
                    account: account.address,
                    marker: response.result.marker
                })
            } else {
                break
            }
        }
        return offers
    }

    static async getOfferCreatesFromCurrencyTrader(account: CurrencyTraderPassiveAccount | CurrencyTraderAccount): Promise<Transaction[]> {
        return (await CurrencyTraderPassiveAccount.getOfferCreateMetasFromCurrencyTrader(account)).map(x => x.transaction)
    }
}
