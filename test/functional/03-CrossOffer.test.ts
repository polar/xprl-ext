import {Client, OfferCreate, TransactionStream, TxResponse} from "xrpl";
import {TestingAccountFactory} from "../support/TestingAccountFactory";
import {XRPCurrencyIssuer,Account,CurrencyIssuerAccount,TransactionProcessor} from "../../src/lib";

jest.setTimeout(1000000000)
function log<T>(obj:T) : T { console.log(JSON.stringify(obj,null,2)); return obj}
let api = new Client("wss://s.altnet.rippletest.net:51233")
let af = new TestingAccountFactory({api:api, defaultAccountDirectory: "./test-run/accounts"})
let XRP = new XRPCurrencyIssuer()
let bob : Account
let carol : Account
let SHT : CurrencyIssuerAccount
let events : TransactionStream[] = []

async function processStream(tx: TransactionStream) {
    events.push(tx)
}


async function sleep(msec: number) {
    return new Promise(resolve => setTimeout(resolve, msec));
}

beforeAll( async () => {
    await api.connect()
    await af.ensureDefaultAccountDirectory()
    bob = await af.getTestAccount("bob", 1000) as Account
    carol = await af.getTestAccount("carol", 1000) as Account
    let sht = await af.getTestAccount("SHT", 1000) as Account
    SHT = await af.getCurrencyIssuerFromAccount(sht, "SHT") as CurrencyIssuerAccount
    await af.setAccountValue(bob, SHT, 123, 1000)
    await af.setAccountValue(carol, SHT, 1, 1000)
    await sleep(2000)
    api.on("transaction", (tx) => processStream(tx))
    await api.request({command: "subscribe", accounts: [bob.address, carol.address]})
})

afterAll( async () => {
    await api.disconnect()
})


describe("Cross Offer", () => {
    test("Offer should be fully crossed", async () => {
        let bobBals1 = await bob.getLabeledBalances()
        let carBals1 = await carol.getLabeledBalances()
        let tp = new TransactionProcessor([bob,carol])
        let xrpDrops = XRP.xrpToDrops(50)
        let bobResponse : TxResponse =
            await bob.submitOfferAndWait3(xrpDrops, SHT.amount(100))
        let bobOffer = bobResponse.result as OfferCreate
        tp.addOffer(bobOffer)

        let carolResponse = await carol.submitOfferAndWait3( SHT.amount(100), XRP.xrpToDrops(50))
        let carolOffer = carolResponse.result as OfferCreate
        tp.addOffer(carolOffer)
        let allEvents : TransactionStream[] = []
        while(allEvents.length < 2) {
            while(events.length > 0) {
                let event = events.pop()
                if (event) {
                    allEvents.push(event)
                    tp.processTransactionStream(event)
                }
            }
            await sleep(1000)
        }

        let bobR = tp.getOffer(bobOffer)
        let carR = tp.getOffer(carolOffer)

        let bobBals2 = await bob.getLabeledBalances()
        let carBals2 = await carol.getLabeledBalances()
        log({
            bob: {
                xrp: bobBals2.getRationalBalance(XRP).toDecimal(6),
                cur: bobBals2.getRationalBalance(SHT).toDecimal(15),
                xrpP: bobBals1.getRationalBalance(XRP).toDecimal(6),
                curP: bobBals1.getRationalBalance(SHT).toDecimal(15),
                xrpD: bobBals2.getRationalBalance(XRP).subtract(bobBals1.getRationalBalance(XRP)).toDecimal(6),
                curD: bobBals2.getRationalBalance(SHT).subtract(bobBals1.getRationalBalance(SHT)).toDecimal(15),
                xrpDiff: bobR!.xrpDiff.valueOf(),
                curDiff: bobR!.curDiff.valueOf(),
                deleted: bobR!.deleted
            }})
        log({
            carol: {
                xrp: carBals2.getRationalBalance(XRP).toDecimal(6),
                cur: carBals2.getRationalBalance(SHT).toDecimal(15),
                xrpP: carBals1.getRationalBalance(XRP).toDecimal(6),
                curP: carBals1.getRationalBalance(SHT).toDecimal(15),
                xrpD: carBals2.getRationalBalance(XRP).subtract(carBals1.getRationalBalance(XRP)).toDecimal(6),
                curD: carBals2.getRationalBalance(SHT).subtract(carBals1.getRationalBalance(SHT)).toDecimal(15),
                xrpDiff: carR!.xrpDiff.valueOf(),
                curDiff: carR!.curDiff.valueOf(),
                deleted: bobR!.deleted
            }})

        expect(bobR!.deleted)
        expect(carR!.deleted)
        expect(carR!.curDiff.eq(bobR!.curDiff.negate()))
        expect(carR!.xrpDiff.eq(Number(xrpDrops) - 12))
        expect(bobR!.xrpDiff.eq(Number(xrpDrops) - 12))

        log(tp.getAllOffers())
    })

    test("Offer should be fully crossed method2", async () => {
        let bobBals1 = await bob.getLabeledBalances()
        let carBals1 = await carol.getLabeledBalances()
        let tp = new TransactionProcessor([bob,carol])
        let bobT = await af.getCurrencyTraderFromAccount(bob, SHT)
        let bid = await bobT.txBid(XRP.xrpToDrops(50), "100")

        let xrpDrops = XRP.xrpToDrops(50)
        let submit = await bobT.submitTransactionTilGood(bid)
        let bobResponse = await bobT.wait3(submit)
        let bobOffer = bobResponse.result as OfferCreate
        tp.addOffer(bobOffer)

        let carolResponse = await carol.submitOfferAndWait3( SHT.amount(100), XRP.xrpToDrops(50))
        let carolOffer = carolResponse.result as OfferCreate
        tp.addOffer(carolOffer)
        let allEvents : TransactionStream[] = []
        while(allEvents.length < 2) {
            while(events.length > 0) {
                let event = events.pop()
                if (event) {
                    allEvents.push(event)
                    tp.processTransactionStream(event)
                }
            }
            await sleep(1000)
        }

        let bobR = tp.getOffer(bobOffer)
        let carR = tp.getOffer(carolOffer)

        let bobBals2 = await bob.getLabeledBalances()
        let carBals2 = await carol.getLabeledBalances()
        log({
            bob: {
                xrp: bobBals2.getRationalBalance(XRP).toDecimal(6),
                cur: bobBals2.getRationalBalance(SHT).toDecimal(15),
                xrpP: bobBals1.getRationalBalance(XRP).toDecimal(6),
                curP: bobBals1.getRationalBalance(SHT).toDecimal(15),
                xrpD: bobBals2.getRationalBalance(XRP).subtract(bobBals1.getRationalBalance(XRP)).toDecimal(6),
                curD: bobBals2.getRationalBalance(SHT).subtract(bobBals1.getRationalBalance(SHT)).toDecimal(15),
                xrpDiff: bobR!.xrpDiff.valueOf(),
                curDiff: bobR!.curDiff.valueOf(),
                deleted: bobR!.deleted
            }})
        log({
            carol: {
                xrp: carBals2.getRationalBalance(XRP).toDecimal(6),
                cur: carBals2.getRationalBalance(SHT).toDecimal(15),
                xrpP: carBals1.getRationalBalance(XRP).toDecimal(6),
                curP: carBals1.getRationalBalance(SHT).toDecimal(15),
                xrpD: carBals2.getRationalBalance(XRP).subtract(carBals1.getRationalBalance(XRP)).toDecimal(6),
                curD: carBals2.getRationalBalance(SHT).subtract(carBals1.getRationalBalance(SHT)).toDecimal(15),
                xrpDiff: carR!.xrpDiff.valueOf(),
                curDiff: carR!.curDiff.valueOf(),
                deleted: bobR!.deleted
            }})

        expect(bobR!.deleted)
        expect(carR!.deleted)
        expect(carR!.curDiff.eq(bobR!.curDiff.negate()))
        expect(carR!.xrpDiff.eq(Number(xrpDrops) - 12))
        expect(bobR!.xrpDiff.eq(Number(xrpDrops) - 12))

        log(tp.getAllOffers())
    })
})
