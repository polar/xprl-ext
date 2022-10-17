import ECDSA from "xrpl/dist/npm/ECDSA";
import {Wallet as XrplWallet} from "xrpl";
import {Wallet} from "./Wallet";

interface WalletBaseOptions {
    masterAddress?: string;
}

interface WalletOptions extends WalletBaseOptions {
    seed?: string;
}

interface DeriveWalletOptions extends WalletBaseOptions {
    algorithm?: ECDSA;
}

interface FromMnemonicOptions extends WalletBaseOptions {
    derivationPath?: string;
}

export class WalletFactory {
    static generate(algorithm?: ECDSA): Wallet {
        return new Wallet(XrplWallet.generate(algorithm))
    }

    /**
     * This method only generates a wallet with the masterAddress. It is good enough to use for account
     * addressing, such as sending or naming a currency issuer.
     * @param masterAddress
     */
    static fromAddress(masterAddress: string): Wallet {
        return new Wallet(new XrplWallet("bogus", "bogus", {masterAddress: masterAddress}))
    }

    static fromAddressAndKey(masterAddress: string, public_key: string): Wallet {
        return new Wallet(new XrplWallet(public_key, "bogus", {masterAddress: masterAddress}))
    }

    static fromSeed(seed: string, opts?: DeriveWalletOptions): Wallet {
        return new Wallet(XrplWallet.fromSeed(seed, opts))
    }

    static fromSecret(seed: string, opts?: DeriveWalletOptions): Wallet {
        return new Wallet(XrplWallet.fromSecret(seed, opts))
    }

    static fromMnemonic(mnemonic: string, opts?: FromMnemonicOptions): Wallet {
        return new Wallet(XrplWallet.fromMnemonic(mnemonic, opts))
    }

    static fromEntropy(entropy: Uint8Array | number[], opts?: DeriveWalletOptions): Wallet {
        return new Wallet(XrplWallet.fromEntropy(entropy, opts))
    }
}
