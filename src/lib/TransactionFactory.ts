import {
    AccountSetAsfFlags,
    Client,
    OfferCancel,
    OfferCreate,
    Payment,
    Transaction,
    TrustSet,
    TrustSetFlags
} from "xrpl";
import {AccountBase} from "./AccountBase";
import {Amount} from "xrpl/dist/npm/models/common";
import {AccountSet} from "xrpl/dist/npm/models/transactions/accountSet";

export interface TransactionFactoryProps {
    api?: Client
}

/**
 * This class creates Transactions for the XRPL.
 */
export class TransactionFactory extends AccountBase {
    api?: Client

    constructor(props: TransactionFactoryProps) {
        super()
        this.api = props.api
    }

    init(api?: Client) {
        this.api = api
    }

    txCurrencyPayment(src: string, dest: string, tag: number | undefined, currency: string, issuer: string, amount: string, seq?: number, fee?: string) {
        let txJSON: Payment = {
            TransactionType: "Payment",
            Account: src,
            Destination: dest,
            Amount: {
                currency: currency,
                value: amount,
                issuer: issuer
            },
            Sequence: seq,
            Fee: fee
        }
        if (tag !== undefined) {
            txJSON.DestinationTag = tag
        }
        return this.api!.prepareTransaction(txJSON) as Promise<Transaction>
    }

    txPayment(src: string, dest: string, tag: number | undefined, amount: Amount | string, seq?: number, fee?: string) {
        let txJSON: Payment = {
            TransactionType: "Payment",
            Account: src,
            Destination: dest,
            Amount: amount,
            Sequence: seq,
            Fee: fee
        }
        if (tag !== undefined) {
            txJSON.DestinationTag = tag
        }
        return this.api!.prepareTransaction(txJSON) as Promise<Transaction>
    }

    txOffer(src: string, gets: Amount, pays: Amount, flags?: number, fee?: string) {
        let txJSON: OfferCreate = {
            Account: src,
            TakerGets: gets,
            TakerPays: pays,
            TransactionType: "OfferCreate",
            Flags: flags,
            Fee: fee
        }
        return this.api!.prepareTransaction(txJSON) as Promise<Transaction>
    }

    txCancelOffer(src: string, sequence: number, fee?: string) {
        let txJSON: OfferCancel = {
            TransactionType: "OfferCancel",
            Account: src,
            OfferSequence: sequence,
            Fee: fee
        }
        return this.api!.prepareTransaction(txJSON) as Promise<Transaction>
    }


    txTrustSet(src: string, issuer: string, currency: string, limit: string, enableRipple: boolean, fee?: string | undefined, seq?: number) {
        let txJSON: TrustSet = {
            TransactionType: "TrustSet",
            Account: src,
            Flags: !enableRipple ? TrustSetFlags.tfSetNoRipple : TrustSetFlags.tfClearNoRipple,
            LimitAmount: {
                currency: currency,
                issuer: issuer,
                value: limit.toString()
            },
            Sequence: seq,
            Fee: fee
        }
        return (this.api!.prepareTransaction(txJSON) as Promise<Transaction>)
    }

    txAccountSetDefaultRipple(src: string) {
        let txJSON: AccountSet = {
            TransactionType: "AccountSet",
            Account: src,
            SetFlag: AccountSetAsfFlags.asfDefaultRipple
        }
        return this.api!.prepareTransaction(txJSON) as Promise<Transaction>
    }

    txAccountClearDefaultRipple(src: string) {
        let txJSON: AccountSet = {
            TransactionType: "AccountSet",
            Account: src,
            ClearFlag: AccountSetAsfFlags.asfDefaultRipple
        }
        return this.api!.prepareTransaction(txJSON) as Promise<Transaction>
    }
}
