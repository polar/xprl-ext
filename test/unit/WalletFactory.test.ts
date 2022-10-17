import {AccountDelete} from "xrpl";
import {WalletFactory} from "../../src/lib/WalletFactory";


describe("Wallet Factory", () => {

    it("should create the expected wallet from the seed", () => {
        // Note, this seed master account is only on the testnet.
        let wallet2 = WalletFactory.fromSeed("spv6xzN2RwQvJX9Pf8fnuVbeqWsxL")
        expect(wallet2.address).toBe("rh1uSQTQAEQMBog9vcRoPRztrVLQ9yzxMe")
    })

    it("should create a signing wallet", () => {
        // Note, this seed master account is only on the testnet.
        let wallet2 = WalletFactory.fromSeed("spv6xzN2RwQvJX9Pf8fnuVbeqWsxL")
        expect(wallet2.isSigning()).toBe(true)
    })

    it("should create a wallet that does not sign", () => {
        let wallet2 = WalletFactory.fromAddress("rh1uSQTQAEQMBog9vcRoPRztrVLQ9yzxMe")
        expect(wallet2.isSigning()).toBe(false)
    })

    it("should create a verifying wallet", () => {
        let wallet = WalletFactory.fromSeed("spv6xzN2RwQvJX9Pf8fnuVbeqWsxL")
        let x = wallet.sign({
            TransactionType: 'AccountDelete',
            Destination: "rh1uSQTQAEQMBog9vcRoPRztrVLQ9yzxMe"
        } as AccountDelete)
        expect(wallet.verifyTransaction(x.tx_blob))

        let wallet2 = WalletFactory.fromAddressAndKey("rh1uSQTQAEQMBog9vcRoPRztrVLQ9yzxMe", wallet.publicKey)
        expect(wallet2.isVerifying())
        expect(wallet2.verifyTransaction(x.tx_blob)).toBe(true)
    })
})
