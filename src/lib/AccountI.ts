import {SubmitResponse, Transaction, TxResponse} from "xrpl";
import {PassiveAccountI} from "./PassiveAccountI";
import {Amount} from "xrpl/dist/npm/models/common";

export interface AccountI extends PassiveAccountI {
    /**
     * This method submits the transaction. If the sequence number is not supplied
     * in the transaction, the sequence number is gotten from this account's
     * transaction sequencer.
     * @param transaction
     */
    submitTransaction(transaction: Transaction): Promise<SubmitResponse>

    /**
     * This method submits the transaction and immediately waits for acknowledgement.
     * @param transaction
     */
    submitTransactionAndWait(transaction: Transaction): Promise<TxResponse>

    /**
     * This method submits the transaction and immediately waits for acknowledgement.
     * @param transaction
     * @param time
     * @param limit The number of times it should be resubmitted.
     */
    submitTransactionAndWait3(transaction: Transaction, time: number, limit: number): Promise<TxResponse>

    /**
     * This method submits a sequence of transactions.
     * @param transactions
     */
    submitSequence(transactions: Transaction[]): Promise<SubmitResponse[]>

    /**
     *
     * @param transactions
     */
    submitSequenceAndWait(transactions: Transaction[]): Promise<TxResponse[]>

    /**
     *
     * @param transactions
     * @param time
     * @param limit
     */
    submitSequenceAndWait3(transactions: Transaction[], time?: number, limit?: number): Promise<TxResponse[]>

    /**
     *
     * @param dest
     * @param currency
     * @param limit
     * @param ripple
     * @param fee
     */
    submitTrustSet(dest: PassiveAccountI | string, currency: string, limit: string, ripple: boolean, fee?: string): Promise<SubmitResponse>

    /**
     *
     * @param dest
     * @param currency
     * @param limit
     * @param enableRipple
     * @param fee
     */
    submitTrustSetAndWait(dest: PassiveAccountI | string, currency: string, limit: string, enableRipple: boolean, fee?: string): Promise<TxResponse>

    /**
     *
     * @param dest
     * @param currency
     * @param limit
     * @param enableRipple
     * @param fee
     */
    submitTrustSetAndWait3(dest: PassiveAccountI | string, currency: string, limit: string, enableRipple: boolean, fee?: string): Promise<TxResponse>

    /**
     *
     * @param dest
     * @param amount
     * @param dest_tag
     * @param fee
     */
    submitPayment(dest: PassiveAccountI | string, amount: Amount, dest_tag?: number, fee?: string): Promise<SubmitResponse>

    /**
     *
     * @param dest
     * @param amount
     * @param dest_tag
     * @param fee
     */
    submitPaymentAndWait(dest: PassiveAccountI | string, amount: Amount, dest_tag?: number, fee?: string): Promise<TxResponse>

    /**
     *
     * @param dest
     * @param amount
     * @param dest_tag
     * @param fee
     */
    submitPaymentAndWait3(dest: PassiveAccountI | string, amount: Amount, dest_tag?: number, fee?: string): Promise<TxResponse>

    /**
     *
     * @param in_amt
     * @param out_amt
     */
    submitOffer(in_amt: Amount, out_amt: Amount): Promise<SubmitResponse>

    /**
     *
     */
    submitSetDefaultRipple(): Promise<SubmitResponse>

    /**
     *
     */
    submitSetDefaultRippleAndWait(): Promise<TxResponse>

    /**
     *
     */
    submitSetDefaultRippleAndWait3(): Promise<TxResponse>

    /**
     *
     */
    submitClearDefaultRipple(): Promise<SubmitResponse>

    /**
     *
     */
    submitClearDefaultRippleAndWait(): Promise<TxResponse>

    /**
     *
     */
    submitClearDefaultRippleAndWait3(): Promise<TxResponse>
}
