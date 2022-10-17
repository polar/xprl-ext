import {Wallet as XrplWallet} from "xrpl";

/**
 * This object represents the Wallet.
 */
export type WalletJSON = {
    publicKey?: string
    privateKey?: string
    classicAddress?: string
}

/**
 * This class is a wrapper around the XrplWallet that has
 * some convenience methods.
 */
export class Wallet extends XrplWallet {

    constructor(wallet: XrplWallet | WalletJSON) {
        super(wallet.publicKey ? wallet.publicKey : "bogus",
            wallet.privateKey ? wallet.privateKey : "bogus",
            wallet.classicAddress ? {masterAddress: wallet.classicAddress} : {});
    }

    isVerifying(): boolean {
        return this.publicKey != "bogus"
    }

    isSigning(): boolean {
        return this.privateKey != "bogus"
    }
    toJSON() : WalletJSON  {
        return {
            publicKey: this.publicKey,
            privateKey: this.privateKey,
            classicAddress: this.classicAddress,
        }
    }
}
