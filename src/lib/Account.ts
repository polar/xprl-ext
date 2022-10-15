import {Client, SubmitResponse, Transaction, TxResponse} from "xrpl";
import {AccountProps} from "./AccountProps";
import {AccountSequencer} from "./AccountSequencer";
import {TransactionFactory} from "./TransactionFactory";
import {PassiveAccount} from "./PassiveAccount";
import {AccountI} from "./AccountI";
import {PassiveAccountI} from "./PassiveAccountI";
import {Amount} from "xrpl/dist/npm/models/common";
import {CurrencyIssuer} from "./CurrencyIssuer";

/**
 * This class is the base implementation of an XRPL Account.
 */
export class Account extends PassiveAccount implements AccountI {
    api?: Client
    sequencer: AccountSequencer
    txFactory: TransactionFactory

    constructor(props: AccountProps) {
        super(props);
        if (!this.wallet.isSigning()) {
            throw "Cannot instantiate Account with passive wallet."
        }
        this.sequencer = new AccountSequencer(props)
        this.txFactory = new TransactionFactory(props)
    }

    /**
     * This method initializes the account with a transaction factory and a
     * transaction sequencer.
     * @param api
     */
    init(api?: Client) {
        this.api = api
        this.txFactory.init(api)
        return this.sequencer.init(api)
            .then(() => this)
    }

    /**
     * This method resets this accounts internal transaction sequencer.
     */
    resetSequence() {
        return this.sequencer.init(this.api).then(() => this)
    }

    private txOffer(in_amt: Amount | string, out_amt: Amount | string, flags?: number, fee?: string) {
        return this.txFactory.txOffer(
            this.wallet.address,
            out_amt, // Taker gets  (out_amt: I pay)
            in_amt,  // Taker pays, (in_amt: I get)
            flags,
            fee)
    }

    /**
     * This async function submits an Offer to the ledger.
     * @param in_amt  This amount is TakerPays
     * @param out_amt This amount is TakerGets
     * @param flags The same flags for the xrpl library.
     * @param fee This is a string representation of the desired fee in drops.
     */
    submitOffer(in_amt: Amount | string, out_amt: Amount | string, flags?: number, fee?: string): Promise<SubmitResponse> {
        return this.txOffer(in_amt, out_amt, flags, fee).then(tx => this.submitTransaction(tx))
    }

    /**
     * This async function submits an Offer to the ledger and waits for it to be submitted.
     * @param in_amt  This amount is TakerPays
     * @param out_amt This amount is TakerGets
     * @param flags The same flags for the xrpl library.
     * @param fee This is a string representation of the desired fee in drops.
     */
    submitOfferAndWait(in_amt: Amount | string, out_amt: Amount | string, flags?: number, fee?: string): Promise<TxResponse> {
        return this.txOffer(in_amt, out_amt, flags, fee).then(tx => this.submitTransactionAndWait(tx))
    }

    /**
     * This async function submits an Offer to the ledger and waits for it to be submitted.
     * @param in_amt  This amount is TakerPays
     * @param out_amt This amount is TakerGets
     * @param flags The same flags for the xrpl library.
     * @param fee This is a string representation of the desired fee in drops.
     */
    submitOfferAndWait3(in_amt: Amount | string, out_amt: Amount | string, flags?: number, fee?: string): Promise<TxResponse> {
        return this.txOffer(in_amt, out_amt, flags, fee).then(tx => this.submitTransactionAndWait3(tx))
    }

    /**
     * This method creates a CancelOffer transaction.
     * @param sequence
     * @param fee
     */
    txCancelOffer(sequence: number, fee?: string) {
        return this.txFactory.txCancelOffer(this.wallet.address, sequence, fee)
    }

    /**
     * This method constructs and submits an OfferCancel.
     * @param sequence
     * @param fee
     */
    submitOfferCancel(sequence: number, fee?: string) {
        return this.txCancelOffer(sequence, fee).then(tx => this.submitTransaction(tx))
    }

    /**
     * This method constructs and submits an OfferCancel and waits for it to be submitted.
     * @param sequence
     * @param fee
     */
    submitOfferCancelAndWait(sequence: number, fee?: string) {
        return this.txCancelOffer(sequence, fee).then(tx => this.submitTransactionAndWait(tx))
    }

    /**
     * This method constructs and submits an OfferCancel and waits for it to be submitted.
     * @param sequence
     * @param fee
     */
    submitOfferCancelAndWait3(sequence: number, fee?: string) {
        return this.txCancelOffer(sequence, fee).then(tx => this.submitTransactionAndWait3(tx))
    }

    /**
     * This method submits OfferCancels for each the current offers that match the issuers.
     * This method queries the ledger for the current order books.
     * @param in_cur
     * @param out_cur
     * @param fee
     */
    submitCancelAllOrders(in_cur: CurrencyIssuer, out_cur: CurrencyIssuer, fee?: string): Promise<SubmitResponse[]> {
        return this.getOrderBooks(in_cur, out_cur)
            .then(bookResp => bookResp.result.offers)
            .then(offers => offers.filter(offer => offer.Account === this.wallet.address))
            .then(offers => {
                let ps = offers.map(offer => this.txCancelOffer(offer.Sequence, fee))
                return Promise.all(ps)
                    .then(txs => this.submitSequence(txs))
            })
    }

    /**
     * This method submits a transaction with the particular sequence number, if supplied.
     * You may get an error if the sequence number is out of order. If the sequence number
     * is not supplied, it is gotten from this account's internal transaction sequencer.
     * @param transaction
     * @param sequence
     */
    submitTransaction(transaction: Transaction, sequence?: number): Promise<SubmitResponse> {
        transaction.Sequence = sequence || this.sequencer.useNext()
        return this.api!.submit(transaction, {wallet: this.wallet})
            .catch(submitResponse => {
                if (submitResponse.result?.engine_result === "terQUEUED") {
                    return submitResponse
                }
                throw submitResponse
            })
    }

    /**
     * This method submits a transaction with the particular sequence number, if supplied.
     * You may get an error if the sequence number is out of order. If the sequence number
     * is not supplied, it is gotten from this account's internal transaction sequencer.
     * This method waits for the transaction to be acknowledged to be submitted.
     * This method uses the api's submitAndWait function, which does not work all that well.
     * We suggest to use submitTransactionTilGood.
     * @param transaction
     * @param sequence
     */
    submitTransactionAndWait(transaction: Transaction, sequence?: number): Promise<TxResponse> {
        transaction.Sequence = this.sequencer.useNext()
        return this.api!.submitAndWait(transaction, {wallet: this.wallet})
    }

    /**
     * This method submits the Transaction and will keep submitting it until it
     * gets acknowledged unless the limit is reached. A limit of -1 means go on
     * infinitely.
     * @param transaction
     * @param limit
     */
    submitTransactionTilGood(transaction: Transaction, limit: number = -1) {
        return this.until<SubmitResponse>(async () => {
            transaction.Sequence = this.sequencer.useNext()
            return this.api!.submit(transaction, {wallet: this.wallet})
                .then(res => this.log(res))
                .then(submitResponse => {
                    return submitResponse.result.engine_result === "tesSUCCESS" ?
                        submitResponse :
                        Promise.reject(submitResponse)
                })
                .catch(submitResponse => {
                    return submitResponse.result.engine_result === "terQUEUED" ?
                        submitResponse :
                        Promise.reject(submitResponse)
                })
                .catch(submitResponse => {
                    if (["tefPAST_SEQ", "terPRE_SEQ"].some(x => x === submitResponse.result.engine_result)) {
                        this.sequencer.reset()
                        return submitResponse
                    } else {
                        return Promise.reject(submitResponse)
                    }
                })
        }, (submitResponse) => {
            return ["tesSUCCESS", "terQUEUED"].some(x => x === submitResponse.result.engine_result)
        }, limit)
    }

    /**
     * This method submits the Transaction and will keep submitting it until it
     * gets acknowledged unless the limit is reached. A limit of -1 means go on
     * infinitely. This function uses submitTransactionTilGood.
     * @param transaction
     * @param time
     * @param limit
     */
    submitTransactionAndWait3(transaction: Transaction, time: number = 10000, limit: number = -1): Promise<TxResponse> {
        return this.submitTransactionTilGood(transaction, limit)
            .then(submitResponse => this.until(async () =>
                    this.later(time)
                        .then(() => this.api!.request({
                                command: "tx",
                                transaction: submitResponse.result.tx_json.hash
                            }
                        ))
                        .then(res => this.log(res as TxResponse)),
                (tx) => tx!.result.validated, limit))
            .then(res => this.log(res))
    }

    /**
     * This method submits a sequence of transactions. The sequence numbers of the
     * transactions come from this account's internal transaction sequencer.
     * @param transactions
     */
    submitSequence(transactions: Transaction[]): Promise<SubmitResponse[]> {
        return transactions.reduce((accResponses, tx) =>
                accResponses.then(txs =>
                    this.submitTransaction(tx).then(txr => txs.concat([txr]))),
            Promise.resolve([] as SubmitResponse[]))
    }

    /**
     * This method submits a sequence of transactions. The sequence numbers of the
     * transactions come from this account's internal transaction sequencer.
     * This method uses submitTransactionAndWait from the api, which does not work all that well.
     * @param transactions
     */
    submitSequenceAndWait(transactions: Transaction[]): Promise<TxResponse[]> {
        return transactions.reduce((accResponses, tx) =>
                accResponses.then(txs =>
                    this.submitTransactionAndWait(tx).then(txr => txs.concat([txr]))),
            Promise.resolve([] as TxResponse[]))
    }

    /**
     * This method submits all the transactions one at a time and waits for each transaction
     * to be submitted and acknowledged. The time and limit parameters are for EACH transaction
     * as it is submitted to submitTransactionAndWait3.
     * @param transactions
     * @param time
     * @param limit
     */
    submitSequenceAndWait3(transactions: Transaction[], time?: number, limit?: number): Promise<TxResponse[]> {
        this.log({submitSequenceAndWait3: transactions.length})
        return transactions.reduce((accResponses, tx) =>
                accResponses.then(txs =>
                    this.submitTransactionAndWait3(tx, time, limit).then(txr => txs.concat([txr]))),
            Promise.resolve([] as TxResponse[]))
    }

    /**
     * This method constructs a TrustSet transaction and submits it.
     * @param issuer
     * @param currency
     * @param limit
     * @param enableRipple
     * @param fee
     */
    submitTrustSet(issuer: PassiveAccountI | string, currency: string, limit: string, enableRipple: boolean, fee?: string): Promise<SubmitResponse> {
        return this.txFactory.txTrustSet(this.wallet.address,
            typeof (issuer) === "string" ? issuer : ((issuer as PassiveAccountI).wallet.address),
            currency,
            limit,
            enableRipple,
            fee)
            .then(tx => this.submitTransaction(tx))
    }

    /**
     * This method constructs a TrustSet transaction and submits it. This method will wait
     * until the Submit is acknowledged. It uses the api's submitAndWait call which does not
     * work that well. Use submitTrustSetAndWait3 for better results.
     * @param issuer
     * @param currency
     * @param limit
     * @param enableRipple
     * @param fee
     */
    submitTrustSetAndWait(issuer: PassiveAccountI | string, currency: string, limit: string, enableRipple: boolean, fee?: string): Promise<TxResponse> {
        return this.txFactory.txTrustSet(this.wallet.address,
            typeof (issuer) === "string" ? issuer : ((issuer as PassiveAccountI).wallet.address),
            currency,
            limit,
            enableRipple,
            fee)
            .then(tx => this.submitTransactionAndWait(tx))
    }

    /**
     This method constructs a TrustSet transaction and submits it. This method will wait
     until the Submit is acknowledged. It uses submitTrustSetAndWait3.
     * @param issuer
     * @param currency
     * @param limit
     * @param enableRipple
     * @param fee
     */
    submitTrustSetAndWait3(issuer: PassiveAccountI | string, currency: string, limit: string, enableRipple: boolean, fee?: string): Promise<TxResponse> {
        return this.txFactory.txTrustSet(this.wallet.address,
            typeof (issuer) === "string" ? issuer : ((issuer as PassiveAccountI).wallet.address),
            currency,
            limit,
            enableRipple,
            fee)
            .then(tx => this.submitTransactionAndWait3(tx))
    }

    /**
     * This method creates a Payment transaction and submits it.
     * @param dest
     * @param amount
     * @param dest_tag
     * @param fee
     */
    submitPayment(dest: PassiveAccountI | string, amount: Amount, dest_tag?: number, fee?: string): Promise<SubmitResponse> {
        return this.txFactory.txPayment(this.wallet.address,
            typeof (dest) === "string" ? dest : ((dest as PassiveAccountI).wallet.address),
            dest_tag || typeof (dest) === "string" ? dest_tag : (dest as PassiveAccountI).tag,
            amount,
            undefined,
            fee)
            .then(tx => this.submitTransaction(tx))
    }

    /**
     * This method creates a Payment transaction and submits it.
     * This method uses the api's submitTransactionAndWait, which does not work all that well.
     * Please use submitPaymentAndWait3.
     * @param dest
     * @param amount
     * @param dest_tag
     * @param fee
     */
    submitPaymentAndWait(dest: PassiveAccountI | string, amount: Amount, dest_tag?: number, fee?: string): Promise<TxResponse> {
        return this.txFactory.txPayment(this.wallet.address,
            typeof (dest) === "string" ? dest : ((dest as PassiveAccountI).wallet.address),
            dest_tag || typeof (dest) === "string" ? dest_tag : (dest as PassiveAccountI).tag,
            amount,
            undefined,
            fee)
            .then(tx => this.submitTransactionAndWait(tx))
    }

    /**
     *
     * This method creates a Payment transaction and submits it.
     * This method uses submitTransactionAndWait3.
     * @param dest
     * @param amount
     * @param dest_tag
     * @param fee
     */
    submitPaymentAndWait3(dest: PassiveAccountI | string, amount: Amount, dest_tag?: number, fee?: string): Promise<TxResponse> {
        return this.txFactory.txPayment(this.wallet.address,
            typeof (dest) === "string" ? dest : ((dest as PassiveAccountI).wallet.address),
            dest_tag || typeof (dest) === "string" ? dest_tag : (dest as PassiveAccountI).tag,
            amount,
            undefined,
            fee)
            .then(tx => this.submitTransactionAndWait3(tx))
    }

    /**
     * This method constructs a SetDefaultRipple transaction and submits it.
     */
    submitSetDefaultRipple() {
        return this.txFactory.txAccountSetDefaultRipple(this.wallet.address)
            .then(tx => this.submitTransaction(tx))
    }

    /**
     * This method constructs a SetDefaultRipple transaction and submits it.
     * This method uses the api's submitTransactionAndWait, which does not work that well.
     * Please use submitSetDefaultRippleAndWait3
     */
    submitSetDefaultRippleAndWait() {
        return this.txFactory.txAccountSetDefaultRipple(this.wallet.address)
            .then(tx => this.submitTransactionAndWait(tx))
    }

    /**
     * This method constructs a SetDefaultRipple transaction and submits it.
     * This method uses submitTransactionAndWait3
     */
    submitSetDefaultRippleAndWait3() {
        return this.txFactory.txAccountSetDefaultRipple(this.wallet.address)
            .then(tx => this.submitTransactionAndWait3(tx))
    }

    /**
     * This method constructs a ClearDefaultRipple transaction and submits it.
     */
    submitClearDefaultRipple() {
        return this.txFactory.txAccountSetDefaultRipple(this.wallet.address)
            .then(tx => this.submitTransaction(tx))
    }

    /**
     * This method constructs a ClearDefaultRipple transaction and submits it.
     * This method uses the api's submitTransactionAndWait, which does not work that well.
     * Please use submitClearDefaultRippleAndWait3.
     */
    submitClearDefaultRippleAndWait() {
        return this.txFactory.txAccountSetDefaultRipple(this.wallet.address)
            .then(tx => this.submitTransactionAndWait(tx))
    }

    /**
     * This method constructs a ClearDefaultRipple transaction and submits it.
     * This method uses submitTransactionAndWait3.
     */
    submitClearDefaultRippleAndWait3() {
        return this.txFactory.txAccountSetDefaultRipple(this.wallet.address)
            .then(tx => this.submitTransactionAndWait3(tx))
    }

    /**
     * This method queries the api, i.e. submits a request, for server_info and
     * account_info to determine if the account contains enough XRP in drops to
     * fund a number of objects, such as trust lines, etc.
     * @param drops
     * @param objects
     */
    isFundedDrops(drops: number, objects: number) {
        return this.api!.request({command: "server_info", account: this.wallet.address})
            .then(server_info =>
                this.api!.request({command: "account_info", account: this.wallet.address})
                    .then(res =>
                        Number(res.result.account_data.Balance) >= (drops +
                            server_info.result.info.validated_ledger!.reserve_base_xrp * 1e6 +
                            (objects + res.result.account_data.OwnerCount) *
                            server_info.result.info.validated_ledger!.reserve_inc_xrp * 1e6)
                    ))
    }
}
