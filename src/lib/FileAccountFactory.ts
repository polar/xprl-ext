import {AccountFactory, AccountFactoryProps, AccountOptions, WalletOptions} from "./AccountFactory";
import {constants as FsConstants, promises as fs} from "fs";
import {Account} from "./Account";
import {log} from "./Logger";
import {Wallet} from "./Wallet";
import {PassiveAccount} from "./PassiveAccount";
import {Wallet as XrpWallet} from "xrpl";

export interface FileAccountFactoryProps extends AccountFactoryProps {
    defaultAccountDirectory?: string
}

/**
 * An object of this class handles reading/writing account specifications
 * to a file of a particular JSON format. CAUTION: May write secrets to a file.
 */
export class FileAccountFactory extends AccountFactory {

    defaultAccountDirectory = "."

    constructor(props: FileAccountFactoryProps) {
        super(props)
        if (props.defaultAccountDirectory) {
            this.defaultAccountDirectory = props.defaultAccountDirectory
        }
    }

    /**
     * This function writes an account to a file. It contains the following JSON:
     *         {
     *             name: "account.name",
     *             wallet: {
     *                 publicKey: "account.wallet.publicKey" | "bogus" | undefined,
     *                 privateKey: "account.wallet.privateKey" | "bogus" | undefined,
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


    async getAccount(name: string, directory = this.defaultAccountDirectory) {
        let fileName = directory != "" ? `${directory}/${name}.json` : `${name}.json`
        await fs.access(fileName, FsConstants.R_OK)
        return this.readFromFile(fileName)
    }

    async saveAccount(account: PassiveAccount | Account, directory = this.defaultAccountDirectory) {
        let name = account.name
        let fileName = directory != "" ? `${directory}/${name}.json` : `${name}.json`
        await this.writeToFile(fileName, account)
    }
}
