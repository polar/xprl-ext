import {AccountFactory, AccountFactoryProps, AccountOptions, WalletOptions} from "./AccountFactory";
import {constants as FsConstants, promises as fs} from "fs";
import {Account} from "./Account";
import {Wallet, WalletJSON} from "./Wallet";
import {PassiveAccount} from "./PassiveAccount";
import {Wallet as XrpWallet} from "xrpl";

export interface FileAccountFactoryProps extends AccountFactoryProps {
    defaultAccountDirectory?: string
}

/**
 * This object represents the Account.
 */
export type AccountJSON = {
    name: string
    wallet: WalletJSON
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


    async ensureDefaultAccountDirectory() {
        try {
            await fs.stat(this.defaultAccountDirectory)
        } catch (error) {
            await fs.mkdir(this.defaultAccountDirectory, {recursive: true})
        }
    }

    getAccountJSON(account: PassiveAccount | Account) : AccountJSON {
        return {
            name: account.name,
            wallet: account.wallet.toJSON()
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
        let accountJSON = this.getAccountJSON(account)
        return fs.writeFile(file, JSON.stringify(accountJSON, null, 2)).then(() => account)
    }

    /**
     * This method reads a specified file and returns an ActiveAccount, which has signing ability,
     * or a PassiveAccount, which is without signing ability.
     * @param file
     * @param opts
     */
    async readFromFile(file: string, opts?: {noinit: boolean}): Promise<Account | PassiveAccount> {
        return fs.readFile(file)
            .then(buf => JSON.parse(buf.toString()) as AccountOptions)
            .then(obj => this.getAccountFromOptions(obj,opts))
    }


    /**
     * Creates an Account or PassiveAccount from the options. Options shall include "name" and
     * name should not be terminated with a ".json" If the wallet.privateKey is "bogus", it generates
     * a PassiveAccount. In some cases you need an Account that can produce transactions, however, you
     * may not forward them to the ledger, using them for fakes.
     * If you need an "active" account, please use a bogus private - public key pair
     * for the wallet options.
     * @param json Object with the options.
     * @param opts Set noinit to true if you do not want to init the account with this factory's api.
     */
    async getAccountFromOptions(json: AccountOptions, opts?: {noinit: boolean}) {
        let wallet = json.wallet as WalletOptions
        let xrpWallet = wallet.familySeed !== undefined ?
            XrpWallet.fromSeed(wallet.familySeed) :
            new XrpWallet(wallet.publicKey!, wallet.privateKey!, {masterAddress: wallet.classicAddress})
        let w = new Wallet(xrpWallet)
        if (w.privateKey === "bogus") {
            return this.createPassiveAccount(json.name, w, json.tag, opts)
        } else {
            return this.createAccount(json.name, w, json.tag, opts)
        }
    }

    /**
     * This method comes back with a file name if it exists. The name is searched as
     * a file name, first. The search is performed as follows:
     * <pre>
     *         `${name}`
     *         `${name}.json`
     * </pre>
     * This method returns undefined if it cannot find the file.
     * @param name
     */
    async getJSONFile(name: string) {
        try {
            await fs.access(name, FsConstants.R_OK)
            return name
        } catch (error : any) {
            try {
                let fileName = `${name}.json`
                await fs.access(`${name}.json`, FsConstants.R_OK)
                return fileName
            } catch (error2 : any) {

            }
        }
    }

    /**
     * Get account for the name. The name may be a file name. The search is performed
     * as follows:
     * <pre>
     *         `${name}`
     *         `${name}.json`
     *         `${directory || defaultAccountsDirectory}/${name}`
     *         `${directory || defaultAccountsDirectory}/${name}.json`
     * </pre>
     *
     * The actual name of the account in contained in the file. So, be warned that the account may
     * have a different name than what you used.
     * @param name
     * @param directory
     */
    async getAccount(name: string, directory = this.defaultAccountDirectory) {
        let fileName = await this.getJSONFile(name)
        if (!fileName) {
            fileName = await this.getJSONFile(`${directory}/${name}`)
        }
        if (!fileName)
            throw `File does not exist for '${name}'`

        return this.readFromFile(fileName)
    }

    /**
     * This method saves the account by name, if it has no name, it is called "default".
     * @param account
     * @param directory
     */
    async saveAccount(account: PassiveAccount | Account, directory = this.defaultAccountDirectory) {
        let name = account.name || account.name == "" ? "default" : account.name
        let fileName = directory != "" ? `${directory}/${name}.json` : `${name}.json`
        await this.writeToFile(fileName, account)
    }
}
