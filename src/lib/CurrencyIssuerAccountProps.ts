import {AccountProps} from "./AccountProps";

export interface CurrencyIssuerAccountProps extends AccountProps {
    currency: string
    defaultPrecision?: number
}