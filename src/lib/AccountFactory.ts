import {AccountBase} from "./AccountBase";
import {Client, Wallet as XrpWallet} from "xrpl";
import {Wallet} from "./Wallet";
import {Account} from "./Account";
import {CurrencyIssuerAccount} from "./CurrencyIssuerAccount";
import {CurrencyTraderAccount} from "./CurrencyTraderAccount";
import {PassiveAccount} from "./PassiveAccount";
import {CurrencyIssuer} from "./CurrencyIssuer";
import {CurrencyIssuerPassiveAccount} from "./CurrencyIssuerPassiveAccount";
import {CrossCurrencyTraderAccount} from "./CrossCurrencyTrader";
import {promises as fs} from "fs";
import {CurrencyTraderPassiveAccount} from "./CurrencyTraderPassiveAccount";

export type AccountFactoryProps = {
    api: Client
}

export type WalletOptions = {
    publicKey?: string, privateKey?: string, classicAddress: string, familySeed?: string
}

export type AccountOptions = {
    name: string, wallet: WalletOptions, tag?: number
}

/**
 * This class provides the functionality of creating different Account basically from
 * reading files using our representation of XRP Wallets.
 */
export class AccountFactory extends AccountBase {
    api: Client

    constructor(props: AccountFactoryProps) {
        super();
        this.api = props.api
    }


    /**
     * This function writes an account to a file. It contains the following JSON:
     *         {
     *             name: "account.name",
     *             wallet: {
     *                 publicKey: "account.wallet.publicKey",
     *                 privateKey: "account.wallet.privateKey" | null,
     *                 classicAddress: "account.wallet.classicAddress"
     *             }
     *         }
     * @param file
     * @param account
     */
    async writeToFile(file: string, account: PassiveAccount | Account): Promise<PassiveAccount | Account> {
        let accountJSON = {
            name: account.name,
            wallet: {
                publicKey: account.wallet.publicKey,
                privateKey: account.wallet.privateKey,
                classicAddress: account.wallet.classicAddress
            }
        }
        return fs.writeFile(file, JSON.stringify(accountJSON, null, 2)).then(() => account)
    }

    /**
     * This method reads a specified file and returns an ActiveAccount, which has signing ability,
     * or a PassiveAccount, which is without signing ability.
     * @param file
     */
    async readFromFile(file: string): Promise<Account | PassiveAccount> {
        return fs.readFile(file)
            .then(buf => JSON.parse(buf.toString()) as AccountOptions)
            .then(obj => {
                let wallet = obj.wallet as WalletOptions
                let xrpWallet = wallet.familySeed !== undefined ?
                    XrpWallet.fromSeed(wallet.familySeed) :
                    new XrpWallet(wallet.publicKey!, wallet.privateKey!, {masterAddress: wallet.classicAddress})
                let w = new Wallet(xrpWallet)
                if (w.privateKey === "bogus") {
                    return this.createPassiveAccount(obj.name, w, obj.tag)
                } else {
                    return this.createAccount(obj.name, w, obj.tag)
                }
            })
    }

    /**
     * This method creates a PassiveAccount with a wallet.
     * @param name
     * @param wallet
     * @param tag
     */
    async createPassiveAccount(name: string, wallet: Wallet, tag?: number) {
        let pa = await new PassiveAccount({name: name, wallet: wallet, tag: tag})
        return await pa.init(this.api)
    }

    /**
     * This method creates an active Account with a wallet that must contain
     * a private key.
     * @param name
     * @param wallet
     * @param tag
     */
    async createAccount(name: string, wallet: Wallet, tag?: number) {
        let a = await new Account({api: this.api, name: name, tag: tag, wallet: wallet})
        return await a.init(this.api)
    }

    /**
     * This method creates an active Account or a PassiveAccount depending on the wallet.
     * @param name
     * @param wallet
     * @param tag
     */
    async create(name: string, wallet: Wallet, tag?: number) {
        if (!wallet.isSigning()) {
            let a = await new PassiveAccount({api: this.api, name: name, tag: tag, wallet: wallet})
            return await a.init(this.api)
        } else {
            let a = await new Account({api: this.api, name: name, tag: tag, wallet: wallet})
            return await a.init(this.api)
        }
    }

    /**
     * This method creates a CurrencyIssuer Account or PassiveAccount depending on the signing
     * capability of the wallet.
     * @param name
     * @param currency
     * @param wallet
     * @param tag
     */
    async createCurrencyIssuer(name: string, currency: string, wallet: Wallet, tag?: number) {
        if (!wallet.isSigning()) {
            let cia = await new CurrencyIssuerPassiveAccount({
                api: this.api, name: name, tag: tag, wallet: wallet, currency: currency
            })
            return await cia.init(this.api) as CurrencyIssuer
        } else {
            let cia = await new CurrencyIssuerAccount({
                api: this.api, name: name, tag: tag, wallet: wallet, currency: currency
            })
            return await cia.init(this.api) as CurrencyIssuer
        }
    }

    /**
     * This method creates a CurrencyTraderAccount. This is an active account that is associated
     * with a particular CurrencyIssuer. A CurrencyTraderAccount has convenience methods for
     * trading currency on the XRP DEX.
     * @param name
     * @param currencyAccount
     * @param wallet
     * @param tag
     */
    async createCurrencyTrader(name: string, currencyAccount: CurrencyIssuer, wallet: Wallet, tag?: number) {
        let cta = await new CurrencyTraderAccount({
            api: this.api,
            name: name,
            tag: tag,
            currencyIssuer: currencyAccount,
            wallet: wallet
        })
        return await cta.init(this.api) as CurrencyTraderAccount
    }

    /**
     * This method creates a CurrencyTraderAccount from an existing active Account. This is an active account
     * that is associated with a particular CurrencyIssuer. A CurrencyTraderAccount has convenience methods for
     * trading currency on the XRP DEX.
     * @param account
     * @param currencyIssuer
     */
    async getCurrencyTraderFromAccount(account: Account, currencyIssuer: CurrencyIssuer) {
        let cta = await new CurrencyTraderAccount({
            name: account.name + ":" + currencyIssuer.currency,
            wallet: account.wallet,
            api: this.api!,
            currencyIssuer: currencyIssuer
        })
        cta.sequencer = account.sequencer
        cta.txFactory = account.txFactory
        return await cta.init(this.api!) as CurrencyTraderAccount
    }

    /**
     * This method creates a CurrencyTraderAccount from an existing active Account. This is a passive account
     * that is associated with a particular CurrencyIssuer. A CurrencyTraderAccount has convenience methods for
     * dealing with currency on the XRP DEX.
     * @param account
     * @param currencyIssuer
     */
    async getCurrencyTraderFromPassiveAccount(account: PassiveAccount, currencyIssuer: CurrencyIssuer) {
        let cta = await new CurrencyTraderPassiveAccount({
            name: account.name + ":" + currencyIssuer.currency,
            wallet: account.wallet,
            api: this.api!,
            currencyIssuer: currencyIssuer
        })
        cta.sequencer = account.sequencer
        cta.txFactory = account.txFactory
        return await cta.init(this.api!) as CurrencyTraderPassiveAccount
    }

    /**
     * This method creates an active account for trading one non-xrp currency to another
     * non-xrp currency. It names the account with a default name consisting of the account
     * name and a colon separating the currencies. Ex. polar:USD-EUR
     * @param account
     * @param west
     * @param east
     */
    async getCrossCurrencyTraderFromAccount(account: Account, west: CurrencyIssuer, east: CurrencyIssuer) {
        let cta = await new CrossCurrencyTraderAccount({
            name: account.name + ":" + west.currency + "-" + east.currency,
            wallet: account.wallet,
            api: this.api!,
            currencyWest: west,
            currencyEast: east
        })
        cta.sequencer = account.sequencer
        cta.txFactory = account.txFactory
        return await cta.init(this.api!) as CrossCurrencyTraderAccount
    }

    /**
     * This method gets the currency issuer Account from an active or passive account.
     * @param account
     * @param currency
     * @param defaultPrecision
     */
    async getCurrencyIssuerFromAccount(account: PassiveAccount, currency: string, defaultPrecision = 1e6) {
        if (account instanceof Account) {
            let cta = await new CurrencyIssuerAccount({
                name: account.name + ":" + currency,
                wallet: account.wallet,
                api: this.api!,
                currency: currency,
                defaultPrecision: defaultPrecision
            })
            cta.sequencer = account.sequencer
            cta.txFactory = account.txFactory
            return await cta.init(this.api!) as CurrencyIssuerAccount
        } else {
            let cta = await new CurrencyIssuerPassiveAccount({
                name: account.name + ":" + currency,
                wallet: account.wallet,
                api: this.api!,
                currency: currency,
                defaultPrecision: defaultPrecision
            })
            cta.sequencer = account.sequencer
            cta.txFactory = account.txFactory
            return await cta.init(this.api!) as CurrencyIssuerPassiveAccount
        }
    }


    /**
     * This method creates a CurrencyTrader account that is a gateway.
     * @param name
     * @param currency
     * @param wallet
     * @param tag
     */
    async createCurrencyGateway(name: string, currency: string, wallet: Wallet, tag?: number) {
        let cia = await new CurrencyIssuerAccount({
            api: this.api, name: name, tag: tag, wallet: wallet, currency: currency
        })
        return await cia.init(this.api) as CurrencyIssuerAccount
    }

    /**
     * This method creates a CurrencyIssuerAccount for the wallet.
     * @param name
     * @param cur
     * @param wallet
     * @param tag
     */
    async createCurrencyIssuerAccount(name: string, cur: string, wallet: Wallet, tag?: number) {
        let cia = await new CurrencyIssuerAccount({
            api: this.api, name: name, tag: tag, wallet: wallet, currency: cur
        })
        return await cia.init(this.api) as CurrencyIssuerAccount
    }
}
