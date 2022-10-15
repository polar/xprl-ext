import {Wallet as XrplWallet} from "xrpl";

/**
 * This class is a wrapper around the XrplWallet that has
 * some convenience methods.
 */
export class Wallet extends XrplWallet {

    constructor(wallet: XrplWallet) {
        super(wallet.publicKey, wallet.privateKey, {masterAddress: wallet.classicAddress});
    }

    isVerifying(): boolean {
        return this.publicKey != "bogus"
    }

    isSigning(): boolean {
        return this.privateKey != "bogus"
    }
}
