import { EndpointId } from '@layerzerolabs/lz-definitions'

import { ExecutorOptionType } from '@layerzerolabs/lz-v2-utilities'

import type { OAppOmniGraphHardhat, OmniPointHardhat } from '@layerzerolabs/toolbox-hardhat'

const kairosContract: OmniPointHardhat = {
    eid: EndpointId.KLAYTN_V2_TESTNET,
    contractName: 'MyOFT',
}

const baseSepContract: OmniPointHardhat = {
    eid: EndpointId.BASESEP_V2_TESTNET,
    contractName: 'MyOFT',
}

const config: OAppOmniGraphHardhat = {
    contracts: [
        {
            contract: kairosContract,
        },
        {
            contract: baseSepContract,
        },
    ],
    connections: [
        {
            from: kairosContract,
            to: baseSepContract,
            // Optional Configuration
            config: {
                // Required Send Library Address on Kairos Testnet
                sendLibrary: '0x6bd925aA58325fba65Ea7d4412DDB2E5D2D9427d',
                receiveLibraryConfig: {
                    // Required Receive Library Address on Kairos Testnet
                    receiveLibrary: '0xFc4eA96c3de3Ba60516976390fA4E945a0b8817B',
                    // Optional Grace Period for Switching Receive Library Address on BSC
                    gracePeriod: BigInt(0),
                },
                // Optional Send Configuration
                // @dev Controls how the `from` chain sends messages to the `to` chain.
                sendConfig: {
                    executorConfig: {
                        maxMessageSize: 10000,
                        // The configured Executor address on Kairos Testnet
                        executor: '0xddF3266fEAa899ACcf805F4379E5137144cb0A7D',
                    },
                    ulnConfig: {
                        // The number of block confirmations to wait on Kairos Testnet before emitting the message from the source chain (Kairos).
                        confirmations: BigInt(0),
                        // The address of the DVNs you will pay to verify a sent message on the source chain (Kairos).
                        // The destination tx will wait until ALL `requiredDVNs` verify the message.
                        requiredDVNs: ["0xe4fe9782b809b7d66f0dcd10157275d2c4e4898d"],
                        // The address of the DVNs you will pay to verify a sent message on the source chain (Kairos).
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify a message.
                        optionalDVNs: [],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 0,
                    },
                },
                // Optional Receive Configuration
                // @dev Controls how the `from` chain receives messages from the `to` chain.
                receiveConfig: {
                    ulnConfig: {
                        // The number of block confirmations to expect from the `to` chain (Base Sepolia).
                        confirmations: BigInt(0),
                        // The address of the DVNs your `receiveConfig` expects to receive verifications from on the `from` chain (Kairos Testnet).
                        // The `from` chain's OApp will wait until the configured threshold of `requiredDVNs` verify the message.
                        requiredDVNs: ["0xe4fe9782b809b7d66f0dcd10157275d2c4e4898d"],
                        // The address of the `optionalDVNs` you expect to receive verifications from on the `from` chain (Kairos Testnet).
                        // The destination tx will wait until the configured threshold of `optionalDVNs` verify the message.
                        optionalDVNs: [],
                        // The number of `optionalDVNs` that need to successfully verify the message for it to be considered Verified.
                        optionalDVNThreshold: 0,
                    },
                },
                // Optional Enforced Options Configuration
                // @dev Controls how much gas to use on the `to` chain, which the user pays for on the source `from` chain.
                enforcedOptions: [
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 60000,
                        value: 0,
                    },
                    {
                        msgType: 1,
                        optionType: ExecutorOptionType.NATIVE_DROP,
                        amount: 0,
                        receiver: '0x1C42aCcd92d491DB8b083Fa953B5E3D9A9E42aD5',
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.LZ_RECEIVE,
                        gas: 60000,
                        value: 1,
                    },
                    {
                        msgType: 2,
                        optionType: ExecutorOptionType.COMPOSE,
                        index: 0,
                        gas: 50000,
                        value: 0,
                    },
                ],
            },
        },
        {
            from: baseSepContract,
            to: kairosContract,
        },
    ],
}

export default config
