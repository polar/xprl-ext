import {TestingAccountFactory} from "../support/TestingAccountFactory";
import {Client} from "xrpl";
import {XRPCurrencyIssuer} from "../../src/lib/XRPCurrencyIssuer";
import {Account} from "../../src/lib/Account";
import {CurrencyIssuerAccount} from "../../src/lib/CurrencyIssuerAccount";

jest.setTimeout(1000000000)

let af : TestingAccountFactory
let api = new Client("wss://s.altnet.rippletest.net:51233")
let XRP: XRPCurrencyIssuer = new XRPCurrencyIssuer()

beforeAll( async () => {
    await api.connect()
    af = new TestingAccountFactory({api: api, defaultAccountDirectory: "./test-run/functional/accounts"})
    await af.ensureDefaultAccountDirectory()
})

afterAll(async () => {
    await api.disconnect()
})

describe("TestingAccountFactory", () => {
    it("should get an account an ensure its XRP balance", async () => {
        let acct = await af.getTestAccount("bob", 1000)
        let amount = await acct.getBalance(XRP)
        expect(Number(amount.value)).toBeGreaterThanOrEqual(1000)
    })

    it("should get an account for USD and supply another account with USD", async() => {
        let acct : Account = await af.getTestAccount("USD", 1000) as Account
        let cur = await af.getCurrencyIssuerFromAccount(acct, "USD") as CurrencyIssuerAccount
        let bob : Account = await af.getTestAccount("bob", 1000) as Account
        await af.setAccountValue(bob, cur, 100, 1000)
        let bals1 = await bob.getLabeledBalances()
        await af.setAccountValue(bob, cur, 200, 1000)
        let bals2 = await bob.getLabeledBalances()
        let usdDiff = bals2.getBalance(cur) - bals1.getBalance(cur)
        expect(usdDiff).toBe(100)
    })
})
