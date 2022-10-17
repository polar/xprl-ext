import {AccountProps} from "./AccountProps";
import {CurrencyIssuer} from "./CurrencyIssuer";

export interface TraderAccountProps extends AccountProps {
    currencyIssuer: CurrencyIssuer
}
