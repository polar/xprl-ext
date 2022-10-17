import {OfferCreate, Transaction, TransactionMetadata, TransactionStream, TxResponse} from "xrpl";
import {log} from "./Logger";
import {BookOffer} from "xrpl/dist/npm/models/methods/bookOffers";
import {Node} from "xrpl/dist/npm/models/transactions/metadata";
import {Account} from "./Account";
import {Rational, RationalNumber} from "./Rational";
import {AccountRoot, RippleState} from "xrpl/dist/npm/models/ledger";

export type OfferCreateAndMetaData = {
    transaction: OfferCreate,
    meta: TransactionMetadata
}


export type OfferLike = (OfferCreate | BookOffer)


/**
 * This class represents the element of an offer contained within
 * the TransactionProcessor. It may contain the original submitted
 * offer, if supplied, and contain associated transactions that were
 * processed with #processTransactionStream.
 */
export class OfferResult {
    /**
     * The original offer and metadata.
     */
    originalOffer?: OfferCreateAndMetaData
    /**
     * The current associated transactions added by processTransactionStream.
     */
    transactions: OfferCreateAndMetaData[] = []
    /**
     * The current calculated XRP difference, in drops, for all the transactions.
     */
    xrpDiff = RationalNumber.zero
    /**
     * The current calculated currency difference for all the transactions.
     */
    curDiff = RationalNumber.zero
    /**
     * This indicates if the OfferCreate has been deleted from the ledger provided
     * by events added by processTransactionStream.
     */
    deleted = false
}

class BookOffers {
    offers = new Map<string, OfferResult>()

    static key(offer: OfferLike) {
        return `${(offer as OfferCreate).Account}:${(offer as OfferCreate).Sequence!}`
    }

    addOffer(offer: OfferLike & {meta?: TransactionMetadata}) {
        let o : OfferCreateAndMetaData = {
            transaction: offer as OfferCreate,
            meta: offer.meta as TransactionMetadata
            }
        let offerE = this.offers.get(BookOffers.key(o.transaction))
        if (!offerE) {
            offerE = new OfferResult()
            this.offers.set(BookOffers.key(o.transaction), offerE)
            offerE.originalOffer = o
        }
        this.offers.set(BookOffers.key(o.transaction), offerE)
    }

    internalAddOffer(offer: OfferCreateAndMetaData) {
        let offerE = this.offers.get(BookOffers.key(offer.transaction))
        if (!offerE) {
            offerE = new OfferResult()
            this.offers.set(BookOffers.key(offer.transaction), offerE)
        }
        offerE.transactions.push(offer)
    }

    getOffer(accountOrOffer: OfferLike | string, sequence?: number) {
        let key : string
        if (sequence && typeof accountOrOffer === "string")
            key = `${accountOrOffer as string}:${sequence!}`
        else
            key = BookOffers.key(accountOrOffer as OfferLike)
        return this.offers.get(key)
    }

    // This method is called on a Process OfferCancel Transaction
    removeOffer(accountOrOffer: OfferLike | OfferResult | string, sequence?: number) {
        if (sequence && typeof accountOrOffer === "string") {
            const key = `${accountOrOffer as string}:${sequence!}`
            let offer = this.offers.get(key)
            this.offers.delete(key)
        } else if (accountOrOffer instanceof OfferResult) {
            let orig = (accountOrOffer as OfferResult).originalOffer?.transaction as OfferCreate
            if (orig) {
                this.removeOffer(orig)
            } else {
                let key
                this.offers.forEach((v,k) => {
                    if (v == accountOrOffer) {
                        key = k
                    }
                })
                if (key) {
                    this.offers.delete(key)
                }
            }
        } else {
            let key = BookOffers.key(accountOrOffer as OfferLike)
            let offer = this.offers.get(BookOffers.key(accountOrOffer as OfferLike))
            this.offers.delete(key)
        }
    }
}

/**
 * This class is the Transaction Processor. It should be called when getting notifications from the XRP api.
 * It will process results from submitted transactions pertaining to orders. We must keep a running count
 * of offers that are successfully submitted. So, as soon as an OfferCreate is submitted and acknowledged
 * with a tesSUCCESS or terQUEUED, addOffer must be called with the TxResponse from the submitted transaction.
 * <pre>
 *     let tp = new TransactionProcessor([acct])
 *     let response = await acct.submitOfferAndWait3(...)
 *     let sequence = response.transaction.Sequence!
 *     let offer = response.result
 *     tp.addOffer(offer)
 *     acct.api.on("transaction", (event) => tp.processTransactionStream(event))
 *     acct.api.request({command: "subscribe", addresses: [acct.address]}
 *
 *     // wait until processed by whatever means
 *     let result = tp.getOffer(offer)  // or tp.getOffer(acct.address, sequence)
 *     ...
 *     // Prevent memory leak and clean up.
 *     if (result.deleted)
 *         tp.removeOffer(offer) // or tp.removeOffer(acct.address, sequence)
 * </pre>
 */
export class TransactionProcessor {
    addresses : string[] = []
    offers = new BookOffers()

    constructor(accounts: Account[]) {
        this.addresses = accounts.map(x => x.address)
    }

    /**
     * This method is used to add a submitted OfferCreate transaction to the processor.
     * <pre>
     *     let response = await acct.submitOfferAndWait3(...)
     *     transactionProcessor.addOffer(response.result)
     * </pre>
     * @param offer
     */
    addOffer(offer: OfferLike & {meta?: TransactionMetadata}) {
        this.offers.addOffer(offer)
    }

    /**
     * This method retrieves the current result for this offer or sequence.
     * <pre>
     *     let response = await acct.submitOfferAndWait3(...)
     *     transactionProcessor.addOffer(response.result)
     *     ...
     *     let result = transactionProcessor.getOffer(response.result)
     * </pre>
     * @param accountOrOffer The OfferCreate transaction, or a string containing the account address, which requires sequence.
     * @param sequence The sequence number of the OfferCreate transaction. Must be supplied if using account address.
     */
    getOffer(accountOrOffer: OfferLike | string, sequence?: number) {
        return this.offers.getOffer(accountOrOffer, sequence)
    }

    /**
     * This method removes the result for this offer or sequence.
     * <pre>
     *     let response = await acct.submitOfferAndWait3(...)
     *     transactionProcessor.addOffer(response.result)
     *     ...
     *     let result = transactionProcessor.getOffer(response.result)
     *     if (result.deleted)
     *         transactionProcessor.removeOffer(result)
     * </pre>
     * Note: if this offer is not deleted from the ledger, it may be reinstated by virtue
     * of processTransactionStream. However, the original offer and subsequence past transactions
     * will be lost. Therefore, the result will be incorrect.
     *
     * @param accountOrOffer The OfferCreate transaction, or a string containing the account address, which requires sequence.
     * @param sequence The sequence number of the OfferCreate transaction. Must be supplied if using account address.
     */
    removeOffer(accountOrOffer: OfferLike | OfferResult | string, sequence?: number) {
        return this.offers.removeOffer(accountOrOffer, sequence)
    }

    private processOfferCreate(offerCreateAndMeta: OfferCreateAndMetaData) {
        this.processOfferCreate2(offerCreateAndMeta)
        let result = this.offers.getOffer(offerCreateAndMeta.transaction)
        if (result) {
            let address = result.originalOffer?.transaction?.Account
            if (address) {
                let xs = [result.originalOffer!, ...result.transactions]
                // Sort and remove duplicate transactions by sequence number, so that they do not get counted.
                xs = xs.sort((a,b) =>
                    a.transaction.Sequence! - b.transaction.Sequence!)
                xs = xs.slice(1).reduce(
                    (a , t) =>
                        (a[a.length-1]!.transaction.Sequence! != t.transaction.Sequence!) ? a.concat([t]) : a,
                    xs.slice(0,1))
                result.xrpDiff = xs.reduce((a, t) =>
                        a.add(this.getXrpDiff(address!,t)), RationalNumber.zero)
                result.curDiff = xs.reduce((a, t) =>
                        a.add(this.getCurrencyDiff(address!,t)), RationalNumber.zero)
            }
        }
    }

    private processOfferCreate2(offerCreateAndMeta: OfferCreateAndMetaData) {
        let affectedNodes = offerCreateAndMeta.meta.AffectedNodes
        let offerCreate = offerCreateAndMeta.transaction
        let bsp = this.offers.getOffer(offerCreate)
        if (bsp) {
            log({processOfferCreate: offerCreateAndMeta})
            this.processCreatedNodes(affectedNodes, offerCreateAndMeta);

            // The real work is in the AffectedNodes

            this.processDeletedNodes(affectedNodes, offerCreateAndMeta)
            this.processOwnModifiedOffers(affectedNodes, offerCreateAndMeta)
            let ownEventTransaction =
                this.addresses.some(a => a === (offerCreate).Account)
            if (ownEventTransaction) {
                // This would be the case should the buy/sell offer be fully crossed and not created.
                this.processOtherModifiedOffers(affectedNodes, offerCreateAndMeta)
                this.processOffer(offerCreate, offerCreateAndMeta)
            }
        } else {
            log({
                message: "processOfferCreate: Not our transaction or already processed",
                sequence: offerCreateAndMeta.transaction.Sequence
            })
        }
    }

    private sameOffer(offer1: OfferLike, offer2: OfferLike) {
        return offer1.Account === offer2.Account && offer1.Sequence === offer2.Sequence
    }

    private processCreatedNodes(affectedNodes: Node[], event: OfferCreateAndMetaData) {
        let createdOffers = affectedNodes
            .filter((an) => "CreatedNode" in an && an.CreatedNode.LedgerEntryType === "Offer")
            .map(d => "CreatedNode" in d && d.CreatedNode.NewFields as unknown as BookOffer)
            .filter(n => n && this.addresses.some(addr => addr === n.Account))
        createdOffers.forEach(n => n && this.offers.internalAddOffer(event))
    }

    private processDeletedNodes(affectedNodes: Node[], event: OfferCreateAndMetaData) {
        let deletedOffers = affectedNodes
            .filter((an) => "DeletedNode" in an && an.DeletedNode.LedgerEntryType === "Offer")
            .map(d => "DeletedNode" in d && d.DeletedNode.FinalFields as unknown as BookOffer)
            .filter(n => n && this.addresses.some(addr => addr === n.Account))
        log({message: "Deleted Offers Count", count: deletedOffers.length})
        for (const offer of deletedOffers) {
            this.processDeletedOffer(offer as BookOffer, event)
        }
    }

    private processDeletedOffer(offer: OfferLike, event: OfferCreateAndMetaData) {
        let bsp = this.offers.getOffer(offer)
        if (bsp) {
            bsp.transactions.push(event)
            bsp.deleted = true
        }
    }

    private processOwnModifiedOffers(affectedNodes: Node[], event: OfferCreateAndMetaData)  : OfferResult | undefined {
        let ownModifiedOffers = affectedNodes
            .filter((an) => "ModifiedNode" in an && an.ModifiedNode.LedgerEntryType === "Offer")
            .map(d => "ModifiedNode" in d && d.ModifiedNode.FinalFields as unknown as BookOffer)
            .filter(n => n && this.addresses.some(a => a === n.Account))
        log({message: "Own Modified Offers Count", count: ownModifiedOffers.length})
        for (const offer of ownModifiedOffers) {
            let result = this.processOffer(offer as BookOffer, event)
            if (result)
                return result
        }
    }

    private processOtherModifiedOffers(affectedNodes: Node[], event: OfferCreateAndMetaData) {
        let otherModifiedOffers = affectedNodes
            .filter((an) => "ModifiedNode" in an && an.ModifiedNode.LedgerEntryType === "Offer")
            .map(d => "ModifiedNode" in d && d.ModifiedNode.FinalFields as unknown as BookOffer)
            .filter(n => n && this.addresses.every(a => a !== n.Account))
        log({message: "Other Modified Offers Count", count: otherModifiedOffers.length})
        if (otherModifiedOffers.length > 0) {
            this.processOtherOffer(event)
        }
    }

    private processOffer(offer: OfferLike, event: OfferCreateAndMetaData)  : OfferResult | undefined {
        let bsp = this.offers.getOffer(offer)
        if (bsp) {
            return bsp
        }
    }

    private processOtherOffer(event: OfferCreateAndMetaData)  : OfferResult | undefined {
        // This Offer does not belong to this account.
        return this.processOffer(event.transaction, event)
    }

    /**
     * This method processes a single event emanating from the api. It only processes OfferCreate
     * and OfferCancel transaction results.
     *
     * If the result is a list of two OfferCreates, the first one is the one that was submitted,
     * and the second is from the transaction event. This means the transaction has been processed
     * internally to this processor, and it has been removed from its internal tracking. The results will
     * may have been adjusted in the second element. It may be used to determine the amount of XRP
     * and the target Currency actually has exchanged.
     * OfferCancels will be processed and ignored.
     * @param event
     */
    processTransactionStream(event: TransactionStream) {
        log({PROCESS_TRANSACTION_STREAM: event.transaction.Sequence})
        let affectedNodes = event.meta?.AffectedNodes
        if (event.transaction.TransactionType === "OfferCreate" && affectedNodes) {
            let offerCreate = event.transaction as OfferCreate
            let offerCreateAndMeta: OfferCreateAndMetaData = {
                transaction: offerCreate,
                meta: event.meta!
            }
            this.processOfferCreate(offerCreateAndMeta)
        }
        if (event.transaction.TransactionType === "OfferCancel") {
            let bsp = this.offers.getOffer(event.transaction.Account, event.transaction.OfferSequence)
            if (bsp) {
                bsp.deleted = true
            }
        }
    }

    getCurrencyDiff(address: string, offer: OfferCreateAndMetaData) {
        let transaction = offer.transaction
        let meta = offer.meta
        function diff(final: RippleState, prev: RippleState) {
            return Rational(final.Balance.value).subtract(prev.Balance.value)
        }

        function diffRippleStateBalance(node: any) {
            if (node && "FinalFields" in node && "PreviousFields" in node) {
                let final = node.FinalFields as RippleState
                let prev = node.PreviousFields as RippleState
                let isEitherNegative = Rational(prev.Balance.value).lt(0) || Rational(final.Balance.value).lt(0)
                let d = isEitherNegative ? diff(prev, final) : diff(final, prev)
                return d // isSell() ? d : d.times(-1)
            } else if (node && "NewFields" in node) {
                let d = Rational(node.NewFields.Balance.value)
                return d //isSell() ? d : d.times(-1)
            }
            return RationalNumber.zero
        }

        let affectedNodes = meta.AffectedNodes
        if (transaction.TransactionType === "OfferCreate" && affectedNodes) {
            let modifiedRippleStates = affectedNodes
                .filter((an) => ("ModifiedNode" in an && an.ModifiedNode.LedgerEntryType === "RippleState"))
                .map(d => "ModifiedNode" in d && d.ModifiedNode)
                .filter(m => m &&
                    ("FinalFields" in m) && ("LowLimit" in m.FinalFields!) && ("HighLimit" in m.FinalFields!) &&
                    (((m.FinalFields as unknown as RippleState).LowLimit.issuer === address) ||
                        ((m.FinalFields as unknown as RippleState).HighLimit.issuer === address))
                )
            let createdRippleStates = affectedNodes
                .filter((an) => ("CreatedNode" in an && an.CreatedNode.LedgerEntryType === "RippleState"))
                .map(d => "CreatedNode" in d && d.CreatedNode)
                .filter(m => m &&
                    ("NewFields" in m) && ("LowLimit" in m.NewFields!) && ("HighLimit" in m.NewFields!) &&
                    (((m.NewFields as unknown as RippleState).LowLimit.issuer === address) ||
                        ((m.NewFields as unknown as RippleState).HighLimit.issuer === address))
                )
            let rippleStates = modifiedRippleStates.concat(createdRippleStates)
            // Should only be one
            log({
                message: "RIPPLE_STATES_NUMBER is ",
                created: createdRippleStates.length,
                modified: modifiedRippleStates.length,
                rippleStates: rippleStates.map(s => diffRippleStateBalance(s).toDecimal(15))
            })
            return rippleStates.reduce((a, s) => a.add(diffRippleStateBalance(s)), RationalNumber.zero)
        }
        return RationalNumber.zero
    }

    getXrpDiff(address: string, offer: OfferCreateAndMetaData) {
        let transaction = offer.transaction
        let meta = offer.meta

        function diff(final: AccountRoot, prev: AccountRoot) {
            return Rational(final.Balance).subtract(prev.Balance)
        }

        function diffAccountRootBalance(node: any) {
            if (node && "FinalFields" in node && "PreviousFields" in node) {
                let final = node.FinalFields as AccountRoot
                let prev = node.PreviousFields as AccountRoot
                let result = diff(final, prev).valueOf()
                return diff(final, prev)
            }
            return RationalNumber.zero
        }

        let affectedNodes = meta.AffectedNodes
        if (transaction.TransactionType === "OfferCreate" && affectedNodes) {
            let rippleStates = affectedNodes
                .filter((an) => "ModifiedNode" in an && an.ModifiedNode.LedgerEntryType === "AccountRoot")
                .map(d => "ModifiedNode" in d && d.ModifiedNode)
                .filter(m => m && ("FinalFields" in m && "Account" in m.FinalFields!) &&
                    (m.FinalFields as unknown as AccountRoot).Account === address)
            // Should only be one
            return rippleStates.reduce((a, s) => a.add(diffAccountRootBalance(s)), RationalNumber.zero)
        }
        return RationalNumber.zero
    }

}

