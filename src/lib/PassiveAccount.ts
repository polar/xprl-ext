import {AccountBase} from "./AccountBase";
import {AccountLinesResponse, BookOffersResponse, Client} from "xrpl";
import {AccountSequencer} from "./AccountSequencer";
import {TransactionFactory} from "./TransactionFactory";
import {AccountProps} from "./AccountProps";
import {AccountBalances, AccountTrustLines, Balance, PassiveAccountI} from "./PassiveAccountI";
import {Wallet} from "./Wallet";
import {CurrencyIssuer} from "./CurrencyIssuer";
import {Spread} from "./Spread";
import {OfferWrapper} from "./OfferWrapper";

export type BookOrders = {
    bookOrders: {
        asks: string[],
        bids: string[],
        spread: {
            ask: any,
            bid: any
        };
        quality: {
            ask: any,
            bid: any
        }
    }
}

export class PassiveAccount extends AccountBase implements PassiveAccountI {
    api?: Client
    name: string
    tag?: number
    wallet: Wallet
    sequencer: AccountSequencer
    txFactory: TransactionFactory

    constructor(props: AccountProps) {
        super();
        this.api = props.api
        this.name = props.name
        this.wallet = props.wallet
        this.tag = props.tag //|| 0 //needs a tag
        this.sequencer = new AccountSequencer(props)
        this.txFactory = new TransactionFactory(props)
    }

    init(api?: Client) {
        this.api = api
        this.txFactory.init(api)
        return this.sequencer.init(api).then(() => this)
    }

    get address() {
        return this.wallet.address
    }

    getBalances(): Promise<Balance[]> {
        return this.api!.getBalances(this.wallet.address)
    }

    getLabeledBalances(peer?: string): Promise<AccountBalances> {
        return this.api!.getBalances(this.wallet.address, {peer: peer})
            .then(balances => new AccountBalances(this.name, this.wallet.address, balances))
    }

    getBalance(currency: CurrencyIssuer): Promise<Balance> {
        return this.api!.getBalances(this.wallet.address)
            .then(bals => bals.find(bal => bal.currency === currency.internalCurrency && bal.issuer === currency.address) || {
                currency: currency.currency,
                value: "0"
            })
    }

    getPeerBalance(currency: CurrencyIssuer): Promise<Balance> {
        return this.api!.getBalances(currency.address!)
            .then(bals => bals.find(bal => bal.currency === currency.internalCurrency && bal.issuer === this.wallet.address) || {
                currency: currency.currency,
                value: "0"
            })
    }

    getTrustLines(peer?: string): Promise<AccountLinesResponse> {
        return this.api!.request({command: "account_lines", account: this.wallet.address, peer: peer})
    }

    getLabeledTrustLines(peer?: string): Promise<AccountTrustLines> {
        return this.api!.request({command: "account_lines", account: this.wallet.address, peer: peer})
            .then(res => ({name: this.name, address: this.wallet.address, trustLines: res}))
    }

    getOrderBooks(in_cur: CurrencyIssuer, out_cur: CurrencyIssuer): Promise<BookOffersResponse> {
        return this.api!.request({
            command: "book_offers",
            taker_pays: in_cur.booking,
            taker_gets: out_cur.booking
        })
    }

    async getAskBidOrderBooks(cur1: CurrencyIssuer, cur2: CurrencyIssuer): Promise<BookOrders> {
        let forward = await this.getOrderBooks(cur1, cur2)
        let reverse = await this.getOrderBooks(cur2, cur1)
        let spread = new Spread()
        let asks: string[] = []
        let bids: string[] = []
        if (reverse.result.offers.length > 0) {
            spread.set(reverse.result.offers[0])
            if (new OfferWrapper(reverse.result.offers[0]).type === "sell") {
                asks = reverse.result.offers.map(x => new OfferWrapper(x).toString())
            } else {
                bids = reverse.result.offers.map(x => new OfferWrapper(x).toString())
            }
        }
        if (forward.result.offers.length > 0) {
            spread.set(forward.result.offers[0])
            if (new OfferWrapper(forward.result.offers[0]).type === "sell") {
                asks = forward.result.offers.map(x => new OfferWrapper(x).toString())
            } else {
                bids = forward.result.offers.map(x => new OfferWrapper(x).toString())
            }
        }
        return {
            bookOrders: {
                spread: {
                    ask: spread.hasAsk ? spread.askRational!.toDecimal(15) : undefined,
                    bid: spread.hasBid ? spread.bidRational!.toDecimal(15) : undefined
                },
                quality: {
                    ask: spread.hasAsk ? spread.askQualityRational!.toDecimal(15) : undefined,
                    bid: spread.hasBid ? spread.bidQualityRational!.toDecimal(15) : undefined
                },
                asks: asks,
                bids: bids
            }
        }
    }

    getAccountInfo() {
        return this.api!.request({command: "account_info", account: this.address})
    }

    async getOwnerCount() {
        let res = await this.getAccountInfo()
        return res.result.account_data.OwnerCount
    }

}
