import {Client} from "xrpl";
import {TestingAccountFactory} from "../support/TestingAccountFactory";
import {Account} from "../../src/lib/Account";
import {XRPCurrencyIssuer} from "../../src/lib/XRPCurrencyIssuer";
import {Rational} from "../../src/lib/Rational";
import {CurrencyIssuerAccount} from "../../src/lib/CurrencyIssuerAccount";

jest.setTimeout(1000000000)
function log<T>(obj:T) : T { console.log(JSON.stringify(obj,null,2)); return obj}
let api = new Client("wss://s.altnet.rippletest.net:51233")
let af = new TestingAccountFactory({api:api, defaultAccountDirectory: "./test-run/accounts"})
let XRP = new XRPCurrencyIssuer()
let bob : Account
let carol : Account
let USD : CurrencyIssuerAccount

beforeAll( async () => {
    await api.connect()
    await af.ensureDefaultAccountDirectory()
    bob = await af.getTestAccount("bob", 1000) as Account
    carol = await af.getTestAccount("carol", 1000) as Account
    let usd = await af.getTestAccount("USD", 1000) as Account
    USD = await af.getCurrencyIssuerFromAccount(usd, "USD") as CurrencyIssuerAccount
})

afterAll(async () => {
    await api.disconnect()
})

describe("Payments", () => {
    test("account should make an XRP payment to another account", async () => {
        let paymentXRP = 32
        let paymentDrops = XRP.xrpToDrops(paymentXRP)
        let feeDrops = "5000"
        let carolBalanceBefore = await carol.getBalance(XRP)
        await bob.submitPaymentAndWait3(carol, paymentDrops, 4, feeDrops)
        let carolBalanceAfter = await carol.getBalance(XRP)
        let carolDiff = Rational(carolBalanceAfter.value).subtract(Rational(carolBalanceBefore.value))
        let carolDiffValue = carolDiff.valueOf()
        expect(carolDiff.eq(Rational(paymentDrops).subtract(feeDrops)))
    })

    test("account with USD should make USD payment to another", async() => {
        let payment = 100
        // Sets trust lines automatically if needed.
        await af.setAccountValue(bob, USD, payment, payment*100)
        await af.setAccountValue(carol, USD, 0, payment*100)

        let bobBal1 = await bob.getLabeledBalances()
        let carolBal1 = await carol.getLabeledBalances()

        await bob.submitPaymentAndWait3(carol, USD.amount(payment))

        let bobBal2 = await bob.getLabeledBalances()
        let carolBal2 = await carol.getLabeledBalances()

        let bobDiff = bobBal2.getBalance(USD) - bobBal1.getBalance(USD)
        let carolDiff = carolBal2.getBalance(USD) - carolBal1.getBalance(USD)

        expect(bobDiff).toBe(0-payment)
        expect(carolDiff).toBe(payment)

    })
})
