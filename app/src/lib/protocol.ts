import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { Program, IdlAccounts, BN } from "@coral-xyz/anchor";

/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/liilend.json`.
 */
export type Liilend = {
  "address": "BrtmpQXVMryfdrtTQLxFaJtSTa78nULPuxJcQfFznpQc",
  "metadata": {
    "name": "liilend",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "LiiLend - Crypto-collateralized borrowing for emerging markets"
  },
  "instructions": [
    {
      "name": "acceptAuthority",
      "discriminator": [
        107,
        86,
        198,
        91,
        33,
        12,
        107,
        160
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "borrowAsset",
      "discriminator": [
        137,
        132,
        185,
        253,
        184,
        171,
        113,
        203
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "borrowMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "borrowPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  98,
                  111,
                  114,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "borrowMint"
              }
            ]
          }
        },
        {
          "name": "vaultAta",
          "writable": true
        },
        {
          "name": "userAta",
          "writable": true
        },
        {
          "name": "borrowMint"
        },
        {
          "name": "collateralPriceFeed"
        },
        {
          "name": "borrowPriceFeed"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "collectFees",
      "discriminator": [
        164,
        152,
        207,
        99,
        30,
        186,
        19,
        182
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "configureAsset",
      "discriminator": [
        238,
        74,
        81,
        244,
        242,
        202,
        217,
        52
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "priceFeed",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  105,
                  99,
                  101,
                  45,
                  102,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "assetIndex",
          "type": "u8"
        },
        {
          "name": "assetType",
          "type": {
            "defined": {
              "name": "assetType"
            }
          }
        },
        {
          "name": "maxLtvBps",
          "type": "u16"
        },
        {
          "name": "liquidationThresholdBps",
          "type": "u16"
        },
        {
          "name": "liquidationPenaltyBps",
          "type": "u16"
        },
        {
          "name": "reserveFactorBps",
          "type": "u16"
        },
        {
          "name": "depositCap",
          "type": "u64"
        },
        {
          "name": "borrowCap",
          "type": "u64"
        },
        {
          "name": "oracleSource",
          "type": {
            "defined": {
              "name": "oracleSource"
            }
          }
        },
        {
          "name": "pythPriceFeed",
          "type": "pubkey"
        },
        {
          "name": "switchboardPriceFeed",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "depositCollateral",
      "discriminator": [
        156,
        131,
        142,
        116,
        146,
        247,
        162,
        120
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "userCollateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "vaultAta",
          "writable": true
        },
        {
          "name": "userAta",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initProtocol",
      "discriminator": [
        3,
        188,
        141,
        237,
        225,
        226,
        232,
        210
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "liquidatePosition",
      "discriminator": [
        187,
        74,
        229,
        149,
        102,
        81,
        221,
        68
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "collateralVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "borrowVault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "borrowMint"
              }
            ]
          }
        },
        {
          "name": "liquidateeAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "liquidatee"
              }
            ]
          }
        },
        {
          "name": "liquidateeCollateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "liquidatee"
              },
              {
                "kind": "account",
                "path": "collateralMint"
              }
            ]
          }
        },
        {
          "name": "liquidateeBorrow",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  98,
                  111,
                  114,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "liquidatee"
              },
              {
                "kind": "account",
                "path": "borrowMint"
              }
            ]
          }
        },
        {
          "name": "collateralVaultAta",
          "writable": true
        },
        {
          "name": "borrowVaultAta",
          "writable": true
        },
        {
          "name": "liquidatorAta",
          "writable": true
        },
        {
          "name": "collateralMint"
        },
        {
          "name": "borrowMint"
        },
        {
          "name": "liquidatee"
        },
        {
          "name": "liquidator",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "maxDebtToRepay",
          "type": "u64"
        }
      ]
    },
    {
      "name": "repayDebt",
      "discriminator": [
        79,
        200,
        30,
        15,
        252,
        22,
        162,
        8
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "repayMint"
              }
            ]
          }
        },
        {
          "name": "borrowPosition",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  98,
                  111,
                  114,
                  114,
                  111,
                  119
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "repayMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "vaultAta",
          "writable": true
        },
        {
          "name": "userAta",
          "writable": true
        },
        {
          "name": "repayMint"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "setPaused",
      "discriminator": [
        91,
        60,
        125,
        192,
        176,
        225,
        166,
        218
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "paused",
          "type": "bool"
        }
      ]
    },
    {
      "name": "setPriceFeed",
      "discriminator": [
        13,
        15,
        231,
        129,
        61,
        7,
        28,
        122
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "priceFeed",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  105,
                  99,
                  101,
                  45,
                  102,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "pythPriceAccount"
        },
        {
          "name": "switchboardPriceAccount"
        },
        {
          "name": "assetMint"
        },
        {
          "name": "authority",
          "signer": true,
          "relations": [
            "protocolState"
          ]
        }
      ],
      "args": [
        {
          "name": "price",
          "type": "u64"
        },
        {
          "name": "decimals",
          "type": "u8"
        },
        {
          "name": "confidence",
          "type": "u64"
        },
        {
          "name": "emaPrice",
          "type": "u64"
        }
      ]
    },
    {
      "name": "transferAuthority",
      "discriminator": [
        48,
        169,
        76,
        72,
        229,
        180,
        55,
        161
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        },
        {
          "name": "newAuthority",
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "updateAssetConfig",
      "discriminator": [
        104,
        102,
        158,
        165,
        28,
        229,
        131,
        81
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "priceFeed",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  105,
                  99,
                  101,
                  45,
                  102,
                  101,
                  101,
                  100
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "maxLtvBps",
          "type": "u16"
        },
        {
          "name": "liquidationThresholdBps",
          "type": "u16"
        },
        {
          "name": "depositCap",
          "type": "u64"
        },
        {
          "name": "borrowCap",
          "type": "u64"
        },
        {
          "name": "isActive",
          "type": "bool"
        }
      ]
    },
    {
      "name": "withdrawCollateral",
      "discriminator": [
        115,
        135,
        168,
        106,
        139,
        214,
        138,
        150
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "userCollateral",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              },
              {
                "kind": "account",
                "path": "assetMint"
              }
            ]
          }
        },
        {
          "name": "userAccount",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  117,
                  115,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "authority"
              }
            ]
          }
        },
        {
          "name": "vaultAta",
          "writable": true
        },
        {
          "name": "userAta",
          "writable": true
        },
        {
          "name": "assetMint"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "shareAmount",
          "type": "u128"
        }
      ]
    },
    {
      "name": "withdrawTreasury",
      "discriminator": [
        40,
        63,
        122,
        158,
        144,
        216,
        83,
        96
      ],
      "accounts": [
        {
          "name": "protocolState",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108
                ]
              }
            ]
          }
        },
        {
          "name": "treasury",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  108,
                  105,
                  105,
                  108,
                  101,
                  110,
                  100,
                  45,
                  116,
                  114,
                  101,
                  97,
                  115,
                  117,
                  114,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "treasuryAta",
          "writable": true
        },
        {
          "name": "recipientAta",
          "writable": true
        },
        {
          "name": "mint"
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "borrowPosition",
      "discriminator": [
        243,
        140,
        20,
        139,
        32,
        243,
        114,
        55
      ]
    },
    {
      "name": "priceFeed",
      "discriminator": [
        189,
        103,
        252,
        23,
        152,
        35,
        243,
        156
      ]
    },
    {
      "name": "protocolState",
      "discriminator": [
        33,
        51,
        173,
        134,
        35,
        140,
        195,
        248
      ]
    },
    {
      "name": "treasuryAccount",
      "discriminator": [
        204,
        140,
        18,
        173,
        90,
        152,
        134,
        123
      ]
    },
    {
      "name": "userAccount",
      "discriminator": [
        211,
        33,
        136,
        16,
        186,
        110,
        242,
        127
      ]
    },
    {
      "name": "userCollateralAccount",
      "discriminator": [
        175,
        96,
        83,
        114,
        145,
        33,
        21,
        218
      ]
    },
    {
      "name": "vaultAccount",
      "discriminator": [
        230,
        251,
        241,
        83,
        139,
        202,
        93,
        28
      ]
    }
  ],
  "events": [
    {
      "name": "assetConfigUpdated",
      "discriminator": [
        12,
        97,
        64,
        94,
        123,
        177,
        111,
        10
      ]
    },
    {
      "name": "assetConfigured",
      "discriminator": [
        197,
        158,
        128,
        228,
        166,
        38,
        26,
        134
      ]
    },
    {
      "name": "authorityTransferStarted",
      "discriminator": [
        226,
        104,
        201,
        223,
        128,
        33,
        164,
        193
      ]
    },
    {
      "name": "authorityTransferred",
      "discriminator": [
        245,
        109,
        179,
        54,
        135,
        92,
        22,
        64
      ]
    },
    {
      "name": "borrowEvent",
      "discriminator": [
        86,
        8,
        140,
        206,
        215,
        179,
        118,
        201
      ]
    },
    {
      "name": "depositEvent",
      "discriminator": [
        120,
        248,
        61,
        83,
        31,
        142,
        107,
        144
      ]
    },
    {
      "name": "feesCollected",
      "discriminator": [
        233,
        23,
        117,
        225,
        107,
        178,
        254,
        8
      ]
    },
    {
      "name": "liquidationEvent",
      "discriminator": [
        3,
        13,
        21,
        93,
        173,
        136,
        72,
        144
      ]
    },
    {
      "name": "pausedStateChanged",
      "discriminator": [
        161,
        234,
        226,
        214,
        101,
        192,
        86,
        199
      ]
    },
    {
      "name": "priceFeedUpdated",
      "discriminator": [
        59,
        119,
        29,
        6,
        20,
        216,
        111,
        71
      ]
    },
    {
      "name": "repayEvent",
      "discriminator": [
        129,
        213,
        0,
        108,
        218,
        108,
        82,
        140
      ]
    },
    {
      "name": "treasuryWithdraw",
      "discriminator": [
        164,
        41,
        149,
        134,
        248,
        87,
        41,
        218
      ]
    },
    {
      "name": "withdrawEvent",
      "discriminator": [
        22,
        9,
        133,
        26,
        160,
        44,
        71,
        192
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "protocolPaused",
      "msg": "Protocol is paused"
    },
    {
      "code": 6001,
      "name": "insufficientCollateral",
      "msg": "Insufficient collateral"
    },
    {
      "code": 6002,
      "name": "borrowExceedsMaxLtv",
      "msg": "Borrow exceeds max LTV"
    },
    {
      "code": 6003,
      "name": "positionLiquidatable",
      "msg": "Position is liquidatable"
    },
    {
      "code": 6004,
      "name": "invalidOraclePrice",
      "msg": "Invalid oracle price"
    },
    {
      "code": 6005,
      "name": "staleOraclePrice",
      "msg": "Stale oracle price"
    },
    {
      "code": 6006,
      "name": "mathOverflow",
      "msg": "Math overflow"
    },
    {
      "code": 6007,
      "name": "unauthorizedAccess",
      "msg": "Unauthorized access"
    },
    {
      "code": 6008,
      "name": "poolFull",
      "msg": "Pool is full"
    },
    {
      "code": 6009,
      "name": "insufficientLiquidity",
      "msg": "Insufficient liquidity in pool"
    },
    {
      "code": 6010,
      "name": "invalidCollateralAsset",
      "msg": "Invalid collateral asset"
    },
    {
      "code": 6011,
      "name": "invalidBorrowAsset",
      "msg": "Invalid borrow asset"
    },
    {
      "code": 6012,
      "name": "zeroAmount",
      "msg": "Amount must be greater than zero"
    },
    {
      "code": 6013,
      "name": "slippageExceeded",
      "msg": "Slippage tolerance exceeded"
    },
    {
      "code": 6014,
      "name": "alreadyInitialized",
      "msg": "Account already initialized"
    },
    {
      "code": 6015,
      "name": "notInitialized",
      "msg": "Account not initialized"
    },
    {
      "code": 6016,
      "name": "invalidAuthority",
      "msg": "Invalid authority"
    },
    {
      "code": 6017,
      "name": "minimumDepositNotMet",
      "msg": "Minimum deposit not met"
    },
    {
      "code": 6018,
      "name": "repaymentExceedsDebt",
      "msg": "Repayment exceeds debt"
    },
    {
      "code": 6019,
      "name": "invalidFeeConfig",
      "msg": "Invalid fee configuration"
    },
    {
      "code": 6020,
      "name": "treasuryOperationFailed",
      "msg": "Treasury operation failed"
    },
    {
      "code": 6021,
      "name": "cpiCallFailed",
      "msg": "CPI call failed"
    },
    {
      "code": 6022,
      "name": "oraclePriceUnavailable",
      "msg": "Oracle price unavailable"
    },
    {
      "code": 6023,
      "name": "liquidationThresholdNotReached",
      "msg": "Liquidation threshold not reached"
    },
    {
      "code": 6024,
      "name": "noDebtToLiquidate",
      "msg": "No debt to liquidate"
    },
    {
      "code": 6025,
      "name": "protocolInsolvent",
      "msg": "Protocol insolvent"
    },
    {
      "code": 6026,
      "name": "shareCalculationOverflow",
      "msg": "Share calculation overflow"
    },
    {
      "code": 6027,
      "name": "invalidShareConversion",
      "msg": "Invalid share conversion"
    },
    {
      "code": 6028,
      "name": "depositCapReached",
      "msg": "Deposit cap reached for asset"
    },
    {
      "code": 6029,
      "name": "exchangeRateUnavailable",
      "msg": "Exchange rate unavailable"
    },
    {
      "code": 6030,
      "name": "borrowCapReached",
      "msg": "Borrow cap reached"
    },
    {
      "code": 6031,
      "name": "withdrawalLocked",
      "msg": "Withdrawal locked - cooldown active"
    },
    {
      "code": 6032,
      "name": "invalidProtocolIntegration",
      "msg": "Invalid protocol integration"
    },
    {
      "code": 6033,
      "name": "fallbackProtocolUnavailable",
      "msg": "Fallback protocol unavailable"
    }
  ],
  "types": [
    {
      "name": "assetConfigUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "maxLtvBps",
            "type": "u16"
          },
          {
            "name": "liquidationThresholdBps",
            "type": "u16"
          },
          {
            "name": "depositCap",
            "type": "u64"
          },
          {
            "name": "borrowCap",
            "type": "u64"
          },
          {
            "name": "isActive",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "assetConfigured",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "mint",
            "type": "pubkey"
          },
          {
            "name": "assetType",
            "type": {
              "defined": {
                "name": "assetType"
              }
            }
          },
          {
            "name": "maxLtvBps",
            "type": "u16"
          },
          {
            "name": "liquidationThresholdBps",
            "type": "u16"
          }
        ]
      }
    },
    {
      "name": "assetType",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "collateral"
          },
          {
            "name": "borrowable"
          },
          {
            "name": "both"
          }
        ]
      }
    },
    {
      "name": "authorityTransferStarted",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "current",
            "type": "pubkey"
          },
          {
            "name": "proposed",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "authorityTransferred",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "newAuthority",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "borrowEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "asset",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "debtShares",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "borrowPosition",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "borrowMint",
            "type": "pubkey"
          },
          {
            "name": "debtShares",
            "type": "u128"
          },
          {
            "name": "borrowTs",
            "type": "i64"
          },
          {
            "name": "lastAccrualTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "depositEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "asset",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "feesCollected",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          }
        ]
      }
    },
    {
      "name": "liquidationEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "liquidator",
            "type": "pubkey"
          },
          {
            "name": "liquidatee",
            "type": "pubkey"
          },
          {
            "name": "debtRepaid",
            "type": "u64"
          },
          {
            "name": "collateralSeized",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "oracleSource",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "pyth"
          },
          {
            "name": "switchboard"
          }
        ]
      }
    },
    {
      "name": "pausedStateChanged",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "paused",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "priceFeed",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "confidence",
            "type": "u64"
          },
          {
            "name": "emaPrice",
            "type": "u64"
          },
          {
            "name": "lastUpdateTs",
            "type": "i64"
          },
          {
            "name": "oracleSource",
            "type": {
              "defined": {
                "name": "oracleSource"
              }
            }
          },
          {
            "name": "isValid",
            "type": "bool"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "priceFeedUpdated",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "asset",
            "type": "pubkey"
          },
          {
            "name": "price",
            "type": "u64"
          },
          {
            "name": "decimals",
            "type": "u8"
          },
          {
            "name": "confidence",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "protocolIntegration",
      "type": {
        "kind": "enum",
        "variants": [
          {
            "name": "marginFi"
          },
          {
            "name": "saveFinance"
          }
        ]
      }
    },
    {
      "name": "protocolState",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "proposedAuthority",
            "type": "pubkey"
          },
          {
            "name": "treasury",
            "type": "pubkey"
          },
          {
            "name": "feeAuthority",
            "type": "pubkey"
          },
          {
            "name": "paused",
            "type": "bool"
          },
          {
            "name": "assetCount",
            "type": "u8"
          },
          {
            "name": "globalDepositShares",
            "type": "u128"
          },
          {
            "name": "globalDebtShares",
            "type": "u128"
          },
          {
            "name": "totalDepositsUsd",
            "type": "u128"
          },
          {
            "name": "totalBorrowsUsd",
            "type": "u128"
          },
          {
            "name": "protocolFeesAccrued",
            "type": "u64"
          },
          {
            "name": "lastUpdateTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "repayEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "asset",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "debtShares",
            "type": "u128"
          }
        ]
      }
    },
    {
      "name": "treasuryAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "treasuryBump",
            "type": "u8"
          },
          {
            "name": "feeAccumulator",
            "type": "u64"
          },
          {
            "name": "insuranceFund",
            "type": "u64"
          },
          {
            "name": "spreadRevenue",
            "type": "u64"
          },
          {
            "name": "liquidationFees",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "treasuryWithdraw",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "recipient",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "userAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "collateralShares",
            "type": "u128"
          },
          {
            "name": "debtShares",
            "type": "u128"
          },
          {
            "name": "lastInteractionTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "userCollateralAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "shares",
            "type": "u128"
          },
          {
            "name": "depositTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "vaultAccount",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "assetMint",
            "type": "pubkey"
          },
          {
            "name": "totalShares",
            "type": "u128"
          },
          {
            "name": "totalValue",
            "type": "u64"
          },
          {
            "name": "protocolIntegration",
            "type": {
              "defined": {
                "name": "protocolIntegration"
              }
            }
          },
          {
            "name": "integratedProtocolMarket",
            "type": "pubkey"
          },
          {
            "name": "lpTokenAccount",
            "type": "pubkey"
          },
          {
            "name": "yieldAccrued",
            "type": "u64"
          },
          {
            "name": "lastYieldUpdateTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "withdrawEvent",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "user",
            "type": "pubkey"
          },
          {
            "name": "asset",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "type": "u64"
          },
          {
            "name": "shares",
            "type": "u128"
          }
        ]
      }
    }
  ]
};


export const PROGRAM_ID = new PublicKey(
  "BrtmpQXVMryfdrtTQLxFaJtSTa78nULPuxJcQfFznpQc"
);

export type ProtocolStateAccount = IdlAccounts<Liilend>["protocolState"];
export type UserAccount = IdlAccounts<Liilend>["userAccount"];
export type VaultAccount = IdlAccounts<Liilend>["vaultAccount"];
export type PriceFeedAccount = IdlAccounts<Liilend>["priceFeed"];
export type BorrowPositionAccount = IdlAccounts<Liilend>["borrowPosition"];
export type UserCollateralAccount = IdlAccounts<Liilend>["userCollateralAccount"];
export type TreasuryAccount = IdlAccounts<Liilend>["treasuryAccount"];

function getConnection(): Connection {
  return new Connection(
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? "https://api.devnet.solana.com"
  );
}

function getProgramIdl(): Liilend {
  return {
    address: PROGRAM_ID.toBase58(),
    metadata: {
      name: "liilend",
      version: "0.1.0",
      spec: "0.1.0",
      description: "LiiLend - Crypto-collateralized borrowing for emerging markets",
    },
    instructions: [],
    accounts: [],
    events: [],
    errors: [],
    types: [],
  } as unknown as Liilend;
}

export async function getProtocolState(
  program: Program<Liilend>
): Promise<ProtocolStateAccount> {
  const [pda] = deriveProtocolStatePDA();
  return program.account.protocolState.fetch(pda);
}

export async function getUserAccount(
  program: Program<Liilend>,
  owner: PublicKey
): Promise<UserAccount | null> {
  const [pda] = deriveUserAccountPDA(owner);
  try {
    return await program.account.userAccount.fetch(pda);
  } catch {
    return null;
  }
}

export async function getVaultAccount(
  program: Program<Liilend>,
  assetMint: PublicKey
): Promise<VaultAccount | null> {
  const [pda] = deriveVaultPDA(assetMint);
  try {
    return await (program.account as any).vaultAccount.fetch(pda) as VaultAccount;
  } catch {
    return null;
  }
}

export async function getPriceFeed(
  program: Program<Liilend>,
  assetMint: PublicKey
): Promise<PriceFeedAccount | null> {
  const [pda] = derivePriceFeedPDA(assetMint);
  try {
    return await program.account.priceFeed.fetch(pda);
  } catch {
    return null;
  }
}

export function deriveProtocolStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-protocol")],
    PROGRAM_ID
  );
}

export function deriveUserAccountPDA(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-user"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveVaultPDA(assetMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-vault"), assetMint.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveUserCollateralPDA(
  owner: PublicKey,
  assetMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-user"), owner.toBuffer(), assetMint.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveBorrowPositionPDA(
  owner: PublicKey,
  borrowMint: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-borrow"), owner.toBuffer(), borrowMint.toBuffer()],
    PROGRAM_ID
  );
}

export function derivePriceFeedPDA(assetMint: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-price-feed"), assetMint.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveTreasuryPDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("liilend-treasury")],
    PROGRAM_ID
  );
}

export function getDepositShares(
  vault: VaultAccount,
  userCollateral: UserCollateralAccount
): number {
  if (vault.totalShares.isZero()) return 0;
  return Number(userCollateral.shares.toString());
}

export function calculateUserEquity(
  userCollateral: UserCollateralAccount,
  vault: VaultAccount,
  price: number
): number {
  if (vault.totalShares.isZero() || vault.totalValue.isZero()) return 0;

  const shareRatio = Number(userCollateral.shares.toString()) / Number(vault.totalShares.toString());
  const poolValue = Number(vault.totalValue.toString()) * price;
  return shareRatio * poolValue;
}

export function calculateBorrowLimit(
  collateralValueUsd: number,
  maxLtvBps: number
): number {
  return collateralValueUsd * (maxLtvBps / 10_000);
}

export function calculateHealthFactor(
  totalBorrowedUsd: number,
  totalCollateralUsd: number,
  liquidationThresholdBps: number
): number {
  if (totalBorrowedUsd === 0) return 100;
  const maxDebtAllowed = totalCollateralUsd * (liquidationThresholdBps / 10_000);
  return maxDebtAllowed / totalBorrowedUsd;
}

export function calculateUtilizationRate(
  totalBorrows: BN,
  totalDeposits: BN
): number {
  if (totalDeposits.isZero()) return 0;
  return Number(totalBorrows.toString()) / Number(totalDeposits.toString());
}
