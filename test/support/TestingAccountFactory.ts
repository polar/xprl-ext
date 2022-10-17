import {Wallet} from "../../src/lib/Wallet";
import {Account} from "../../src/lib/Account";
import {CurrencyIssuer} from "../../src/lib/CurrencyIssuer";
import {WalletFactory} from "../../src/lib/WalletFactory";
import {log} from "../../src/lib/Logger";
import {CurrencyIssuerAccount} from "../../src/lib/CurrencyIssuerAccount";
import {Rational, RationalNumber} from "../../src/lib/Rational";
import {XRPCurrencyIssuer} from "../../src/lib/XRPCurrencyIssuer";
import {FileAccountFactory, FileAccountFactoryProps} from "../../src/lib/FileAccountFactory";
import {IssuedCurrencyAmount} from "xrpl/dist/npm/models/common";

export class TestingAccountFactory extends FileAccountFactory {

    constructor(props: FileAccountFactoryProps) {
        super(props);
    }

    async createFundedAccount(name: string, tag?: number): Promise<Account> {
        let wallet : Wallet;
        await this.api.fundWallet(wallet = WalletFactory.generate());
        let a = await new Account({api: this.api, name: name, tag: tag, wallet: wallet})
        return await a.init(this.api)
    }

    async createFundedCurrencyIssuer(name: string, currency: string, tag?: number): Promise<CurrencyIssuer> {
        let wallet : Wallet;
        await this.api.fundWallet(wallet = WalletFactory.generate());
        return await this.createCurrencyIssuer(name, currency, wallet, tag)
    }

    async createFundedCurrencyTrader(name: string, currencyAccount: CurrencyIssuer, tag?: number) {
        let wallet : Wallet;
        await this.api.fundWallet(wallet = WalletFactory.generate());
        return await this.createCurrencyTrader(name, currencyAccount, wallet, tag)
    }

    async createFundedCurrencyGateway(name: string, currency: string, tag?: number) {
        let wallet : Wallet;
        await this.api.fundWallet(wallet = WalletFactory.generate());
        return await this.createCurrencyGateway(name, currency, wallet, tag)
    }

    async createFundedCurrencyIssuerAccount(name: string, currency: string, tag?: number) {
        let wallet : Wallet;
        await this.api.fundWallet(wallet = WalletFactory.generate());
        return await this.createCurrencyIssuerAccount(name, currency, wallet, tag)
    }

    async getTestAccount(name: string, minimum: number, directory? : string) {
        try {
            let acct = await this.getAccount(name, directory)
            if (acct instanceof Account) {
                await this.ensureXRPBalance(acct, minimum)
            }
            return acct
        } catch (reason) {
            let acct = await this.createFundedAccount(name)
            await this.saveAccount(acct)
            await acct.submitSetDefaultRippleAndWait3()
            return this.ensureXRPBalance(acct, minimum)
        }
    }

    XRP = new XRPCurrencyIssuer()
    async ensureXRPBalance(acct: Account, minimum: number) {
        let bal = await acct.getBalance(this.XRP)
        while (Number(bal.value) < minimum) {
            await acct.api!.fundWallet(acct.wallet)
            bal = await acct.getBalance(this.XRP)
        }
        return acct
    }

    async getCurrencyIssuer(name: string, currency: string, defaultPrecision: number) {
        return this.getTestAccount(name, 1000)
            .then(acct => this.getCurrencyIssuerFromAccount(acct as Account, currency, defaultPrecision))
    }

    async setAccountValue(account: Account, cur: CurrencyIssuerAccount, amount: number, trust?: number) {
        let bals = await account.getBalances()
        let bal = await account.getBalance(cur)
        if (Number(bal.value) <= amount) {
            let res = await account.getTrustLines(cur.wallet.address)
            if (res.result.lines.length == 0) {
                let t = trust ? trust : amount == 0 ? 100000 : amount * 1000
                if (t < amount)
                    throw new Error("bad trust amount combination")
                let limit = `${(cur.amount(t) as IssuedCurrencyAmount).value}`
                await account.submitTrustSetAndWait3(cur, cur.currency, limit, true)
            }
            let diff = Rational(amount).subtract(Rational(bal.value)) // Positive or zero
            if (!diff.eq(RationalNumber.zero)) {
                await cur.submitPaymentAndWait3(account, cur.amount(diff))
            }
        } else if (amount < Number(bal.value)) {
            let diff = Rational(bal.value).subtract(Rational(amount))
            if (!diff.eq(RationalNumber.zero)) {
                await account.submitPaymentAndWait3(cur, cur.amount(diff))
            }
        }
    }
    async setAccountValueX(account: Account, cur: CurrencyIssuerAccount, amount: number, minimum: number, maximum?: number) {
        return account.getBalances().then(bals => log(bals))
            .then(() => account.getBalance(cur))
            .then(bal => {
                if (Number(bal.value) < minimum) {
                    return account.getTrustLines(cur.wallet.address)
                        .then(async res => {
                            if (res.result.lines.length == 0) {
                                await account.submitTrustSetAndWait3(cur, cur.currency, `${amount * 1000}`, true)
                                    .then(() => account)
                                    .catch(reason => {
                                        log(reason);
                                        return account
                                    })
                            }
                            let diff = Rational(amount).subtract(Rational(bal.value)) // Positive or zero
                            if (!diff.eq(RationalNumber.zero)) {
                                return cur.submitPaymentAndWait3(account, cur.amount(diff))
                                    .then(() => account)
                                    .catch(reason => {
                                        log(reason);
                                        return account
                                    })
                            } else {
                                return account
                            }
                        })
                } else {
                    if (maximum && maximum < Number(bal.value)) {
                        // We are only allowed to have 16 digits!
                        let x = Rational(bal.value).subtract(Rational(maximum)) // Positive or zero
                        if (x.eq(RationalNumber.zero)) {
                            return account
                        } else {
                            let n = x.toDecimal(15)
                            return account.submitPaymentAndWait3(cur.address, cur.amount(n))
                                .then(() => account)
                                .catch(reason => {
                                    log(reason);
                                    return account
                                })
                        }
                    }
                }
                return account
            })
    }

    ensureMinBalanceBetweenAccounts(recv: Account, send: Account, minimum: number, cur: CurrencyIssuer) {
        return recv.getBalances().then(bals => log(bals))
            .then(() => recv.getBalance(cur))
            .then(bal => {
                if (Number(bal.value) < minimum) {
                    let diff = Rational(minimum).subtract(Rational(bal.value)) // Positive or zero
                    if (!diff.eq(RationalNumber.zero)) {
                        return send.submitPaymentAndWait3(recv, cur.amount(diff.toDecimal(12)))
                            .catch(reason => {
                                log(reason)
                                return recv
                            })
                    } else {
                        return recv
                    }
                }
            })
    }
}
