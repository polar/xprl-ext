import {Wallet} from "xrpl";

export class PassiveWallet extends Wallet {
    constructor(masterAddress: string) {
        super("bogus", "bogus", {masterAddress: masterAddress})
    }
}

