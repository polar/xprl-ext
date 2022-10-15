import {Client} from "xrpl";
import {Wallet} from "./Wallet";

/**
 * This type contains the properties for the Account.
 */
export interface AccountProps {
    api?: Client,
    name: string,
    tag?: number,
    wallet: Wallet
}
