import {Client} from "xrpl";
import {FileAccountFactory} from "../../src/lib/FileAccountFactory";
import * as fs from "fs/promises";
import {WalletFactory} from "../../src/lib/WalletFactory";
import {AccountOptions} from "../../src/lib/AccountFactory";

jest.setTimeout(1000000000)

let api = new Client("wss://s.altnet.rippletest.net:51233")
let defaultAccountsDir = "./test/unit/accounts"
let af = new FileAccountFactory({api: api, defaultAccountDirectory: defaultAccountsDir, noinit: true})

beforeAll( async () => {
    await af.ensureDefaultAccountDirectory()
})

afterAll( async () => {
    try {
        await fs.rmdir(defaultAccountsDir)
    } catch (error) {

    }
})

beforeEach( async () => {
    await fs.rm(`${defaultAccountsDir}/testAccount.json`, {force: true})
})

afterEach( async () => {
    await fs.rm(`${defaultAccountsDir}/testAccount.json`, {force: true})
})

describe("FileAccountFactory", () => {
    test("should create a active account with an address", async () => {
        let acct = await af.createAccount("testAccount",
            WalletFactory.fromSeed( "spv6xzN2RwQvJX9Pf8fnuVbeqWsxL"))
        let json = af.getAccountJSON(acct)
        expect(json.name).toBe("testAccount")
        expect(json.wallet.classicAddress).toBe("rh1uSQTQAEQMBog9vcRoPRztrVLQ9yzxMe")
        expect(json.wallet.privateKey).not.toBe("bogus")
        expect(json.wallet.publicKey).not.toBe("bogus")
    })

    test("Factory should save account file", async () => {
        let acct = await af.createAccount("testAccount",
            WalletFactory.fromSeed( "spv6xzN2RwQvJX9Pf8fnuVbeqWsxL"))
        await af.saveAccount(acct)

        let buf = await fs.readFile(`${defaultAccountsDir}/testAccount.json`)
        let json = JSON.parse(buf.toString()) as AccountOptions
        expect(json.name).toBe("testAccount")
        expect(json.wallet.classicAddress).toBe("rh1uSQTQAEQMBog9vcRoPRztrVLQ9yzxMe")
        expect(json.wallet.privateKey).not.toBe("bogus")
        expect(json.wallet.publicKey).not.toBe("bogus")
    })

    test("Factory should save account and read it", async () => {
        let acct = await af.createAccount("testAccount",
            WalletFactory.fromSeed( "spv6xzN2RwQvJX9Pf8fnuVbeqWsxL"))
        await af.saveAccount(acct)

        let acct2 = await af.getAccount("testAccount")
        expect(acct2.name).toBe(acct.name)
        expect(acct2.wallet.privateKey).toBe(acct.wallet.privateKey)
        expect(acct2.wallet.publicKey).toBe(acct.wallet.publicKey)
        expect(acct2.wallet.classicAddress).toBe(acct.wallet.classicAddress)
    })
})
