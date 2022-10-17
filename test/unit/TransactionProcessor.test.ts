import {Client, TransactionMetadata} from "xrpl";
import {Account} from "../../src/lib/Account";
import {CurrencyIssuerAccount} from "../../src/lib/CurrencyIssuerAccount";
import {OfferCreateAndMetaData, OfferLike, TransactionProcessor} from "../../src/lib/TransactionProcessor";
import {FileAccountFactory} from "../../src/lib/FileAccountFactory";

jest.setTimeout(1000000000)
let api = new Client("wss://s.altnet.rippletest.net:51233")
let af = new FileAccountFactory({api:api, noinit: true})
let bob : Account
let carol : Account
let SHT : CurrencyIssuerAccount

beforeAll( async () => {
    bob = await af.getAccountFromOptions(bobAccount) as Account
    carol = await af.getAccountFromOptions(carolAccount) as Account
    let sht = await af.getAccountFromOptions(SHTAccount) as Account
    SHT = await af.getCurrencyIssuerFromAccount(sht, "SHT") as CurrencyIssuerAccount
})

describe("TransactionProcessor", () => {

    it("should have an offer saved", () => {
        let tp = new TransactionProcessor([bob,carol])
        tp.addOffer(bobOffer)
        let offer = tp.getOffer(bobOffer)
        expect(offer)
        expect(offer!.originalOffer?.transaction.Sequence).toBe(bobOffer.Sequence)
    })

    it("should have offer associated correctly", () => {
        let tp = new TransactionProcessor([bob,carol])
        tp.addOffer(bobOffer)
        tp.processTransactionStream(bobTrans1)
        let offer = tp.getOffer(bobOffer)
        expect(offer)
        expect(offer!.transactions.length).toBe(1)
    })

    it("should have offer associated correctly even if in reverse", () => {
        let tp = new TransactionProcessor([bob,carol])
        tp.processTransactionStream(bobTrans1)
        tp.addOffer(bobOffer)
        let offer = tp.getOffer(bobOffer)
        expect(offer)
        expect(offer!.transactions.length).toBe(1)
        let offerC= tp.getOffer(carolOffer) // We are just using this offer for the key.
        expect(offerC)
        expect(offer!.transactions.length).toBe(1)
        expect(offer!.originalOffer).toBeUndefined()
    })

    test("With all transactions processed the XRP and currency diffs should be correct", () => {
        let tp = new TransactionProcessor([bob,carol])
        tp.processTransactionStream(bobTrans1)
        // Bob offer TakerGets 100 SHT TakerPays 50 XRP
        tp.addOffer(bobOffer)
        // Carol offer TakerGets 50 XRP TakerPays 100 SHT
        tp.addOffer(carolOffer)

        // There are two transactions that get placed on the subscribe channel for both bob and carol
        tp.processTransactionStream(bobTrans1)
        tp.processTransactionStream(bobTrans2)

        // The Offers are designed to fully cross at 100 SHT for 50 XRP. The fee is 12 drops.
        let offer = tp.getOffer(bobOffer)
        expect(offer!.xrpDiff.eq(50*1e6 - 12))
        expect(offer!.curDiff.eq(100))

        let offerC = tp.getOffer(carolOffer)
        expect(offerC!.xrpDiff.eq(-50*1e6 - 12))
        expect(offerC!.curDiff.eq(100))

        // They should be deleted
        expect(offer!.deleted)
        expect(offerC!.deleted)
    })
})

let bobAccount = {
    "name": "bob",
    "wallet": {
        "publicKey": "ED2162B39036A9C1ABBFE2022A19D4C100CED549F868AFD7963EBDB7E86D865DB7",
        "privateKey": "EDF2A588BCF3D1F4915D81F6DBDDFCBC48BD04101C31CFD8D07782B78A42F9B642",
        "classicAddress": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ"
    }
}

let carolAccount = {
    "name": "carol",
    "wallet": {
        "publicKey": "ED2AEE0C78FD413BC4D97C7368C666FC385D60C62540F5C1D5AAFC6F99F9E6DB3F",
        "privateKey": "ED643B381B88FE0A01481482C9B3D32AE8E416AD21A10AFCF8A00B61FD42546531",
        "classicAddress": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi"
    }
}

let SHTAccount = {
    "name": "SHT",
    "wallet": {
        "publicKey": "ED5355119860CD83EACAE6DBFFEA2A307D9C4ED5DC68BD838FDFFFEC14A58E7EE5",
        "privateKey": "ED6727BC41933E251836F7C52104ABE5557C0BC7330176591B296751B282420BD1",
        "classicAddress": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG"
    }
}

let USDAccount = {
    "name": "USD",
    "wallet": {
        "publicKey": "ED1E9908204DB70C2F0A8F7932D2C9F2D036512CC9A652D02ABD8FB3A610511B9D",
        "privateKey": "EDD1CF3B899DFFB891C130ED5E2CD59F8959D902A81AC505B54BEDCB38C4989B0C",
        "classicAddress": "r3VR19e2UgnUSbzPkfMjj8SR3RGeMiXazu"
    }
}


let allOffers =    [
    {
        "key": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ:32058773",
        "originalOffer": {
            "transaction": {
                "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                "Fee": "12",
                "Flags": 0,
                "LastLedgerSequence": 32084722,
                "Sequence": 32058773,
                "SigningPubKey": "ED2162B39036A9C1ABBFE2022A19D4C100CED549F868AFD7963EBDB7E86D865DB7",
                "TakerGets": {
                    "currency": "SHT",
                    "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                    "value": "100"
                },
                "TakerPays": "50000000",
                "TransactionType": "OfferCreate",
                "TxnSignature": "C2392871929BE8BB5ECDBD024D2D8F2B3F89D7C66F3E93654C2AA3132AB9C5ADC7BBD38C40ABD514A6C3B61AF9565FE0BF1B92E46207F106E04E312BB8D2400D",
                "date": 719336441,
                "hash": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                "inLedger": 32084704,
                "ledger_index": 32084704,
                "meta": {
                    "AffectedNodes": [
                        {
                            "CreatedNode": {
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                "NewFields": {
                                    "ExchangeRate": "5a11c37937e08000",
                                    "RootIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "TakerGetsCurrency": "0000000000000000000000005348540000000000",
                                    "TakerGetsIssuer": "83B66651AD69A5E8A188F2FA5F71FD574E2D69CB"
                                }
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "Balance": "3775964352",
                                    "Flags": 8388608,
                                    "OwnerCount": 3,
                                    "Sequence": 32058774
                                },
                                "LedgerEntryType": "AccountRoot",
                                "LedgerIndex": "61DAA35DB07A01CA877B02FF53A727DC704FEB42812E0F36C25FD35454CCA06D",
                                "PreviousFields": {
                                    "Balance": "3775964364",
                                    "OwnerCount": 2,
                                    "Sequence": 32058773
                                },
                                "PreviousTxnID": "37B2CB33C9B64F9DB0F6E473F99B408014D6FC162F63FEB735685C670B93C2DD",
                                "PreviousTxnLgrSeq": 32084592
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Flags": 0,
                                    "Owner": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "RootIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                                },
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                            }
                        },
                        {
                            "CreatedNode": {
                                "LedgerEntryType": "Offer",
                                "LedgerIndex": "EBAC37CB86A8653360F3434E7F82BC4FF613A5C0E201DD3882DF9E17429275A7",
                                "NewFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "BookDirectory": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "Sequence": 32058773,
                                    "TakerGets": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "100"
                                    },
                                    "TakerPays": "50000000"
                                }
                            }
                        }
                    ],
                    "TransactionIndex": 0,
                    "TransactionResult": "tesSUCCESS"
                },
                "validated": true
            },
            "meta": {
                "AffectedNodes": [
                    {
                        "CreatedNode": {
                            "LedgerEntryType": "DirectoryNode",
                            "LedgerIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                            "NewFields": {
                                "ExchangeRate": "5a11c37937e08000",
                                "RootIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                "TakerGetsCurrency": "0000000000000000000000005348540000000000",
                                "TakerGetsIssuer": "83B66651AD69A5E8A188F2FA5F71FD574E2D69CB"
                            }
                        }
                    },
                    {
                        "ModifiedNode": {
                            "FinalFields": {
                                "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                "Balance": "3775964352",
                                "Flags": 8388608,
                                "OwnerCount": 3,
                                "Sequence": 32058774
                            },
                            "LedgerEntryType": "AccountRoot",
                            "LedgerIndex": "61DAA35DB07A01CA877B02FF53A727DC704FEB42812E0F36C25FD35454CCA06D",
                            "PreviousFields": {
                                "Balance": "3775964364",
                                "OwnerCount": 2,
                                "Sequence": 32058773
                            },
                            "PreviousTxnID": "37B2CB33C9B64F9DB0F6E473F99B408014D6FC162F63FEB735685C670B93C2DD",
                            "PreviousTxnLgrSeq": 32084592
                        }
                    },
                    {
                        "ModifiedNode": {
                            "FinalFields": {
                                "Flags": 0,
                                "Owner": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                "RootIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                            },
                            "LedgerEntryType": "DirectoryNode",
                            "LedgerIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                        }
                    },
                    {
                        "CreatedNode": {
                            "LedgerEntryType": "Offer",
                            "LedgerIndex": "EBAC37CB86A8653360F3434E7F82BC4FF613A5C0E201DD3882DF9E17429275A7",
                            "NewFields": {
                                "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                "BookDirectory": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                "Sequence": 32058773,
                                "TakerGets": {
                                    "currency": "SHT",
                                    "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                    "value": "100"
                                },
                                "TakerPays": "50000000"
                            }
                        }
                    }
                ],
                "TransactionIndex": 0,
                "TransactionResult": "tesSUCCESS"
            }
        },
        "transactions": [
            {
                "transaction": {
                    "Account": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                    "Fee": "12",
                    "Flags": 0,
                    "LastLedgerSequence": 32084726,
                    "Sequence": 32058812,
                    "SigningPubKey": "ED2AEE0C78FD413BC4D97C7368C666FC385D60C62540F5C1D5AAFC6F99F9E6DB3F",
                    "TakerGets": "50000000",
                    "TakerPays": {
                        "currency": "SHT",
                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                        "value": "100"
                    },
                    "TransactionType": "OfferCreate",
                    "TxnSignature": "D60DA090BFCFCFEB4EAB25D6B9791DA7D9095C139F065881A68F81CA57ECDEF207A09069114B0FC6894D9A174F78597D4B0FE9D54D7C24B61A7AD0B461A41B07",
                    "date": 719336452,
                    "hash": "4C6260E11C93E5AEF8625D11021EC97841970C3C02065BA1061CDC77D7269943",
                    "owner_funds": "1159998896"
                },
                "meta": {
                    "AffectedNodes": [
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "23"
                                    },
                                    "Flags": 65536,
                                    "HighLimit": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "0"
                                    },
                                    "HighNode": "0",
                                    "LowLimit": {
                                        "currency": "SHT",
                                        "issuer": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                        "value": "1000"
                                    },
                                    "LowNode": "0"
                                },
                                "LedgerEntryType": "RippleState",
                                "LedgerIndex": "3B862342DCCFDEDD5CAF1134E2F528B0BCC0F4CF77E07700FD98C010B1A5A837",
                                "PreviousFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "123"
                                    }
                                },
                                "PreviousTxnID": "1BFD898DCE234D1D93B656B3169B1953880A7335F070129112875D441C014491",
                                "PreviousTxnLgrSeq": 32084696
                            }
                        },
                        {
                            "DeletedNode": {
                                "FinalFields": {
                                    "ExchangeRate": "5a11c37937e08000",
                                    "Flags": 0,
                                    "RootIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "TakerGetsCurrency": "0000000000000000000000005348540000000000",
                                    "TakerGetsIssuer": "83B66651AD69A5E8A188F2FA5F71FD574E2D69CB",
                                    "TakerPaysCurrency": "0000000000000000000000000000000000000000",
                                    "TakerPaysIssuer": "0000000000000000000000000000000000000000"
                                },
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000"
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "Balance": "3825964352",
                                    "Flags": 8388608,
                                    "OwnerCount": 2,
                                    "Sequence": 32058774
                                },
                                "LedgerEntryType": "AccountRoot",
                                "LedgerIndex": "61DAA35DB07A01CA877B02FF53A727DC704FEB42812E0F36C25FD35454CCA06D",
                                "PreviousFields": {
                                    "Balance": "3775964352",
                                    "OwnerCount": 3
                                },
                                "PreviousTxnID": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                                "PreviousTxnLgrSeq": 32084704
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "-101"
                                    },
                                    "Flags": 131072,
                                    "HighLimit": {
                                        "currency": "SHT",
                                        "issuer": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                                        "value": "1000"
                                    },
                                    "HighNode": "0",
                                    "LowLimit": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "0"
                                    },
                                    "LowNode": "0"
                                },
                                "LedgerEntryType": "RippleState",
                                "LedgerIndex": "709BE964CC647806F1876F53FE5CF24F7DDAA10EDC3137D3C4D0371EEBCC842C",
                                "PreviousFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "-1"
                                    }
                                },
                                "PreviousTxnID": "064F70073D80F874FB8B00E647774077340C1C4361B2E6F4FC9215642606EFDD",
                                "PreviousTxnLgrSeq": 32084700
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Flags": 0,
                                    "Owner": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "RootIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                                },
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Account": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                                    "Balance": "1173998896",
                                    "Flags": 8388608,
                                    "OwnerCount": 2,
                                    "Sequence": 32058813
                                },
                                "LedgerEntryType": "AccountRoot",
                                "LedgerIndex": "CB04ACDDFD4327B6D9067FF910861520DDD2B7A6158D4A7570114282405202EB",
                                "PreviousFields": {
                                    "Balance": "1223998908",
                                    "Sequence": 32058812
                                },
                                "PreviousTxnID": "064F70073D80F874FB8B00E647774077340C1C4361B2E6F4FC9215642606EFDD",
                                "PreviousTxnLgrSeq": 32084700
                            }
                        },
                        {
                            "DeletedNode": {
                                "FinalFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "BookDirectory": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "BookNode": "0",
                                    "Flags": 0,
                                    "OwnerNode": "0",
                                    "PreviousTxnID": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                                    "PreviousTxnLgrSeq": 32084704,
                                    "Sequence": 32058773,
                                    "TakerGets": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "0"
                                    },
                                    "TakerPays": "0"
                                },
                                "LedgerEntryType": "Offer",
                                "LedgerIndex": "EBAC37CB86A8653360F3434E7F82BC4FF613A5C0E201DD3882DF9E17429275A7",
                                "PreviousFields": {
                                    "TakerGets": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "100"
                                    },
                                    "TakerPays": "50000000"
                                }
                            }
                        }
                    ],
                    "TransactionIndex": 0,
                    "TransactionResult": "tesSUCCESS"
                }
            },
            {
                "transaction": {
                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                    "Fee": "12",
                    "Flags": 0,
                    "LastLedgerSequence": 32084722,
                    "Sequence": 32058773,
                    "SigningPubKey": "ED2162B39036A9C1ABBFE2022A19D4C100CED549F868AFD7963EBDB7E86D865DB7",
                    "TakerGets": {
                        "currency": "SHT",
                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                        "value": "100"
                    },
                    "TakerPays": "50000000",
                    "TransactionType": "OfferCreate",
                    "TxnSignature": "C2392871929BE8BB5ECDBD024D2D8F2B3F89D7C66F3E93654C2AA3132AB9C5ADC7BBD38C40ABD514A6C3B61AF9565FE0BF1B92E46207F106E04E312BB8D2400D",
                    "date": 719336441,
                    "hash": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                    "owner_funds": "123"
                },
                "meta": {
                    "AffectedNodes": [
                        {
                            "CreatedNode": {
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                "NewFields": {
                                    "ExchangeRate": "5a11c37937e08000",
                                    "RootIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "TakerGetsCurrency": "0000000000000000000000005348540000000000",
                                    "TakerGetsIssuer": "83B66651AD69A5E8A188F2FA5F71FD574E2D69CB"
                                }
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "Balance": "3775964352",
                                    "Flags": 8388608,
                                    "OwnerCount": 3,
                                    "Sequence": 32058774
                                },
                                "LedgerEntryType": "AccountRoot",
                                "LedgerIndex": "61DAA35DB07A01CA877B02FF53A727DC704FEB42812E0F36C25FD35454CCA06D",
                                "PreviousFields": {
                                    "Balance": "3775964364",
                                    "OwnerCount": 2,
                                    "Sequence": 32058773
                                },
                                "PreviousTxnID": "37B2CB33C9B64F9DB0F6E473F99B408014D6FC162F63FEB735685C670B93C2DD",
                                "PreviousTxnLgrSeq": 32084592
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Flags": 0,
                                    "Owner": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "RootIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                                },
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                            }
                        },
                        {
                            "CreatedNode": {
                                "LedgerEntryType": "Offer",
                                "LedgerIndex": "EBAC37CB86A8653360F3434E7F82BC4FF613A5C0E201DD3882DF9E17429275A7",
                                "NewFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "BookDirectory": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "Sequence": 32058773,
                                    "TakerGets": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "100"
                                    },
                                    "TakerPays": "50000000"
                                }
                            }
                        }
                    ],
                    "TransactionIndex": 0,
                    "TransactionResult": "tesSUCCESS"
                }
            }
        ]
    },
    {
        "key": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi:32058812",
        "originalOffer": {
            "transaction": {
                "Account": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                "Fee": "12",
                "Flags": 0,
                "LastLedgerSequence": 32084726,
                "Sequence": 32058812,
                "SigningPubKey": "ED2AEE0C78FD413BC4D97C7368C666FC385D60C62540F5C1D5AAFC6F99F9E6DB3F",
                "TakerGets": "50000000",
                "TakerPays": {
                    "currency": "SHT",
                    "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                    "value": "100"
                },
                "TransactionType": "OfferCreate",
                "TxnSignature": "D60DA090BFCFCFEB4EAB25D6B9791DA7D9095C139F065881A68F81CA57ECDEF207A09069114B0FC6894D9A174F78597D4B0FE9D54D7C24B61A7AD0B461A41B07",
                "date": 719336452,
                "hash": "4C6260E11C93E5AEF8625D11021EC97841970C3C02065BA1061CDC77D7269943",
                "inLedger": 32084708,
                "ledger_index": 32084708,
                "meta": {
                    "AffectedNodes": [
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "23"
                                    },
                                    "Flags": 65536,
                                    "HighLimit": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "0"
                                    },
                                    "HighNode": "0",
                                    "LowLimit": {
                                        "currency": "SHT",
                                        "issuer": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                        "value": "1000"
                                    },
                                    "LowNode": "0"
                                },
                                "LedgerEntryType": "RippleState",
                                "LedgerIndex": "3B862342DCCFDEDD5CAF1134E2F528B0BCC0F4CF77E07700FD98C010B1A5A837",
                                "PreviousFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "123"
                                    }
                                },
                                "PreviousTxnID": "1BFD898DCE234D1D93B656B3169B1953880A7335F070129112875D441C014491",
                                "PreviousTxnLgrSeq": 32084696
                            }
                        },
                        {
                            "DeletedNode": {
                                "FinalFields": {
                                    "ExchangeRate": "5a11c37937e08000",
                                    "Flags": 0,
                                    "RootIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "TakerGetsCurrency": "0000000000000000000000005348540000000000",
                                    "TakerGetsIssuer": "83B66651AD69A5E8A188F2FA5F71FD574E2D69CB",
                                    "TakerPaysCurrency": "0000000000000000000000000000000000000000",
                                    "TakerPaysIssuer": "0000000000000000000000000000000000000000"
                                },
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000"
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "Balance": "3825964352",
                                    "Flags": 8388608,
                                    "OwnerCount": 2,
                                    "Sequence": 32058774
                                },
                                "LedgerEntryType": "AccountRoot",
                                "LedgerIndex": "61DAA35DB07A01CA877B02FF53A727DC704FEB42812E0F36C25FD35454CCA06D",
                                "PreviousFields": {
                                    "Balance": "3775964352",
                                    "OwnerCount": 3
                                },
                                "PreviousTxnID": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                                "PreviousTxnLgrSeq": 32084704
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "-101"
                                    },
                                    "Flags": 131072,
                                    "HighLimit": {
                                        "currency": "SHT",
                                        "issuer": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                                        "value": "1000"
                                    },
                                    "HighNode": "0",
                                    "LowLimit": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "0"
                                    },
                                    "LowNode": "0"
                                },
                                "LedgerEntryType": "RippleState",
                                "LedgerIndex": "709BE964CC647806F1876F53FE5CF24F7DDAA10EDC3137D3C4D0371EEBCC842C",
                                "PreviousFields": {
                                    "Balance": {
                                        "currency": "SHT",
                                        "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                        "value": "-1"
                                    }
                                },
                                "PreviousTxnID": "064F70073D80F874FB8B00E647774077340C1C4361B2E6F4FC9215642606EFDD",
                                "PreviousTxnLgrSeq": 32084700
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Flags": 0,
                                    "Owner": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "RootIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                                },
                                "LedgerEntryType": "DirectoryNode",
                                "LedgerIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                            }
                        },
                        {
                            "ModifiedNode": {
                                "FinalFields": {
                                    "Account": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                                    "Balance": "1173998896",
                                    "Flags": 8388608,
                                    "OwnerCount": 2,
                                    "Sequence": 32058813
                                },
                                "LedgerEntryType": "AccountRoot",
                                "LedgerIndex": "CB04ACDDFD4327B6D9067FF910861520DDD2B7A6158D4A7570114282405202EB",
                                "PreviousFields": {
                                    "Balance": "1223998908",
                                    "Sequence": 32058812
                                },
                                "PreviousTxnID": "064F70073D80F874FB8B00E647774077340C1C4361B2E6F4FC9215642606EFDD",
                                "PreviousTxnLgrSeq": 32084700
                            }
                        },
                        {
                            "DeletedNode": {
                                "FinalFields": {
                                    "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "BookDirectory": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                    "BookNode": "0",
                                    "Flags": 0,
                                    "OwnerNode": "0",
                                    "PreviousTxnID": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                                    "PreviousTxnLgrSeq": 32084704,
                                    "Sequence": 32058773,
                                    "TakerGets": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "0"
                                    },
                                    "TakerPays": "0"
                                },
                                "LedgerEntryType": "Offer",
                                "LedgerIndex": "EBAC37CB86A8653360F3434E7F82BC4FF613A5C0E201DD3882DF9E17429275A7",
                                "PreviousFields": {
                                    "TakerGets": {
                                        "currency": "SHT",
                                        "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                        "value": "100"
                                    },
                                    "TakerPays": "50000000"
                                }
                            }
                        }
                    ],
                    "TransactionIndex": 0,
                    "TransactionResult": "tesSUCCESS"
                },
                "validated": true
            },
            "meta": {
                "AffectedNodes": [
                    {
                        "ModifiedNode": {
                            "FinalFields": {
                                "Balance": {
                                    "currency": "SHT",
                                    "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                    "value": "23"
                                },
                                "Flags": 65536,
                                "HighLimit": {
                                    "currency": "SHT",
                                    "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                    "value": "0"
                                },
                                "HighNode": "0",
                                "LowLimit": {
                                    "currency": "SHT",
                                    "issuer": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                    "value": "1000"
                                },
                                "LowNode": "0"
                            },
                            "LedgerEntryType": "RippleState",
                            "LedgerIndex": "3B862342DCCFDEDD5CAF1134E2F528B0BCC0F4CF77E07700FD98C010B1A5A837",
                            "PreviousFields": {
                                "Balance": {
                                    "currency": "SHT",
                                    "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                    "value": "123"
                                }
                            },
                            "PreviousTxnID": "1BFD898DCE234D1D93B656B3169B1953880A7335F070129112875D441C014491",
                            "PreviousTxnLgrSeq": 32084696
                        }
                    },
                    {
                        "DeletedNode": {
                            "FinalFields": {
                                "ExchangeRate": "5a11c37937e08000",
                                "Flags": 0,
                                "RootIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                "TakerGetsCurrency": "0000000000000000000000005348540000000000",
                                "TakerGetsIssuer": "83B66651AD69A5E8A188F2FA5F71FD574E2D69CB",
                                "TakerPaysCurrency": "0000000000000000000000000000000000000000",
                                "TakerPaysIssuer": "0000000000000000000000000000000000000000"
                            },
                            "LedgerEntryType": "DirectoryNode",
                            "LedgerIndex": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000"
                        }
                    },
                    {
                        "ModifiedNode": {
                            "FinalFields": {
                                "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                "Balance": "3825964352",
                                "Flags": 8388608,
                                "OwnerCount": 2,
                                "Sequence": 32058774
                            },
                            "LedgerEntryType": "AccountRoot",
                            "LedgerIndex": "61DAA35DB07A01CA877B02FF53A727DC704FEB42812E0F36C25FD35454CCA06D",
                            "PreviousFields": {
                                "Balance": "3775964352",
                                "OwnerCount": 3
                            },
                            "PreviousTxnID": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                            "PreviousTxnLgrSeq": 32084704
                        }
                    },
                    {
                        "ModifiedNode": {
                            "FinalFields": {
                                "Balance": {
                                    "currency": "SHT",
                                    "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                    "value": "-101"
                                },
                                "Flags": 131072,
                                "HighLimit": {
                                    "currency": "SHT",
                                    "issuer": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                                    "value": "1000"
                                },
                                "HighNode": "0",
                                "LowLimit": {
                                    "currency": "SHT",
                                    "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                    "value": "0"
                                },
                                "LowNode": "0"
                            },
                            "LedgerEntryType": "RippleState",
                            "LedgerIndex": "709BE964CC647806F1876F53FE5CF24F7DDAA10EDC3137D3C4D0371EEBCC842C",
                            "PreviousFields": {
                                "Balance": {
                                    "currency": "SHT",
                                    "issuer": "rrrrrrrrrrrrrrrrrrrrBZbvji",
                                    "value": "-1"
                                }
                            },
                            "PreviousTxnID": "064F70073D80F874FB8B00E647774077340C1C4361B2E6F4FC9215642606EFDD",
                            "PreviousTxnLgrSeq": 32084700
                        }
                    },
                    {
                        "ModifiedNode": {
                            "FinalFields": {
                                "Flags": 0,
                                "Owner": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                "RootIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                            },
                            "LedgerEntryType": "DirectoryNode",
                            "LedgerIndex": "AD7E1379A60D378729518CE07510AC70317718A9669F3D52DBB1F0AFF1503771"
                        }
                    },
                    {
                        "ModifiedNode": {
                            "FinalFields": {
                                "Account": "rD6siYnvAXBCwKeFidjxpwMN8etuUxXoPi",
                                "Balance": "1173998896",
                                "Flags": 8388608,
                                "OwnerCount": 2,
                                "Sequence": 32058813
                            },
                            "LedgerEntryType": "AccountRoot",
                            "LedgerIndex": "CB04ACDDFD4327B6D9067FF910861520DDD2B7A6158D4A7570114282405202EB",
                            "PreviousFields": {
                                "Balance": "1223998908",
                                "Sequence": 32058812
                            },
                            "PreviousTxnID": "064F70073D80F874FB8B00E647774077340C1C4361B2E6F4FC9215642606EFDD",
                            "PreviousTxnLgrSeq": 32084700
                        }
                    },
                    {
                        "DeletedNode": {
                            "FinalFields": {
                                "Account": "rwddULSPkJPFNm3UBSW8iD5wuTiWcE16xZ",
                                "BookDirectory": "3D84D67F742702831C24A74CB7B5C0A254BFB8FDD2ABFCAA5A11C37937E08000",
                                "BookNode": "0",
                                "Flags": 0,
                                "OwnerNode": "0",
                                "PreviousTxnID": "B832B54DB3F2116558D423AFC9AD0C6D9AC6C5C6DBDD89DD9BCB5736B067DDE7",
                                "PreviousTxnLgrSeq": 32084704,
                                "Sequence": 32058773,
                                "TakerGets": {
                                    "currency": "SHT",
                                    "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                    "value": "0"
                                },
                                "TakerPays": "0"
                            },
                            "LedgerEntryType": "Offer",
                            "LedgerIndex": "EBAC37CB86A8653360F3434E7F82BC4FF613A5C0E201DD3882DF9E17429275A7",
                            "PreviousFields": {
                                "TakerGets": {
                                    "currency": "SHT",
                                    "issuer": "rDrSp7xRF8bABRg9yoyiExc6ygF8pJSooG",
                                    "value": "100"
                                },
                                "TakerPays": "50000000"
                            }
                        }
                    }
                ],
                "TransactionIndex": 0,
                "TransactionResult": "tesSUCCESS"
            }
        },
        "transactions": []
    }
]

let bobOffers = allOffers[0]
let bobOffer = bobOffers.originalOffer.transaction as OfferLike & {meta?: TransactionMetadata}
let bobTrans1 = bobOffers.transactions[0] as OfferCreateAndMetaData
let bobTrans2 = bobOffers.transactions[1] as OfferCreateAndMetaData
let carolOffers = allOffers[1]
let carolOffer = carolOffers.originalOffer.transaction as OfferLike & {meta?: TransactionMetadata}
