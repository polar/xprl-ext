import {Client, Wallet} from "xrpl";
import {AccountProps} from "./AccountProps";
import {AccountBase} from "./AccountBase";

/**
 * An object of this class services as a sequencer for transaction numbers.
 * To reset means to query the API to get the next available transaction sequence
 * number and start from there.
 */
export class AccountSequencer extends AccountBase {
    api?: Client
    name: string
    wallet: Wallet

    sequence: number

    constructor(props: AccountProps) {
        super();
        this.api = props.api
        this.name = props.name
        this.wallet = props.wallet
        this.sequence = 0
    }

    init(api?: Client) {
        this.api = api
        return this.reset()
    }

    reset() {
        return this.api!.request({command: "account_info", account: this.wallet.address})
            //.then(info => this.log(info))
            .then(info => this.sequence = info.result.account_data.Sequence)
    }

    useNext() {
        return this.sequence++
    }
}
