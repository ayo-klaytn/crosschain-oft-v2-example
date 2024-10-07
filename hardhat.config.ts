// Get the environment configuration from .env file
//
// To make use of automatic environment setup:
// - Duplicate .env.example file and name it .env
// - Fill in the environment variables
import 'dotenv/config'

import 'hardhat-deploy'
import 'hardhat-contract-sizer'
import '@nomiclabs/hardhat-ethers'
import '@layerzerolabs/toolbox-hardhat'
import { HardhatUserConfig, HttpNetworkAccountsUserConfig } from 'hardhat/types'

import { task } from 'hardhat/config'
import { getNetworkNameForEid, types } from '@layerzerolabs/devtools-evm-hardhat'
import { EndpointId } from '@layerzerolabs/lz-definitions'
import { addressToBytes32 } from '@layerzerolabs/lz-v2-utilities'
import { Options } from '@layerzerolabs/lz-v2-utilities'
import { BigNumberish, BytesLike } from 'ethers'

interface Args {
    to: string
    toEid: EndpointId
    amount: string
}

interface SendParam {
    dstEid: EndpointId
    to: BytesLike
    amountLD: BigNumberish
    minAmountLD: BigNumberish
    extraOptions: BytesLike
    composeMsg: BytesLike
    oftCmd: BytesLike
}

task('lz:oft:send', 'Sends tokens from MyOFT')
    .addParam('to', 'Recipient address on the destination chain', undefined, types.string)
    .addParam('toEid', 'Destination endpoint ID', undefined, types.eid)
    .addParam('amount', 'Amount to transfer in token decimals', undefined, types.string)
    .setAction(async (taskArgs: Args, hre) => {
        const { ethers, deployments } = hre
        const { to, toEid, amount } = taskArgs

        console.log(`Network: ${hre.network.name}`)

        const oftDeployment = await deployments.get('MyOFT')
        const [signer] = await ethers.getSigners()
        const oftContract = new ethers.Contract(oftDeployment.address, oftDeployment.abi, signer)

        // Check token balance
        const balance = await oftContract.balanceOf(signer.address)
        const decimals = await oftContract.decimals()
        const amountInWei = ethers.utils.parseUnits(amount, decimals)
        console.log(`Token balance: ${ethers.utils.formatUnits(balance, decimals)}`)
        console.log(`Attempting to send: ${amount}`)

        if (balance.lt(amountInWei)) {
            console.error('Insufficient token balance')

            // Check if signer is the owner and can mint
            const owner = await oftContract.owner()
            if (owner.toLowerCase() === signer.address.toLowerCase()) {
                console.log('You are the owner. Attempting to mint tokens...')
                const mintTx = await oftContract.mintTo(signer.address, amountInWei)
                await mintTx.wait()
                console.log(`Minted ${amount} tokens to your address`)
            } else {
                console.error('You are not the owner and cannot mint tokens. Please acquire tokens before sending.')
                return
            }
        }

        // Prepare send parameters
        const sendParam = {
            dstEid: toEid,
            to: addressToBytes32(to),
            amountLD: amountInWei,
            minAmountLD: amountInWei,
            extraOptions: Options.newOptions().addExecutorLzReceiveOption(65000, 0).toBytes(),
            composeMsg: '0x',
            oftCmd: '0x',
        }

        // Get the quote for the send operation
        const feeQuote = await oftContract.quoteSend(sendParam, false)
        const nativeFee = feeQuote.nativeFee

        console.log(`Sending ${amount} token(s) to ${to} on network ${getNetworkNameForEid(toEid)} (${toEid})`)
        console.log(`Estimated fee: ${ethers.utils.formatEther(nativeFee)} native tokens`)

        // Check if signer has enough native tokens for the fee
        const nativeBalance = await signer.getBalance()
        if (nativeBalance.lt(nativeFee)) {
            console.error(`Insufficient native tokens. You need at least ${ethers.utils.formatEther(nativeFee)}`)
            return
        }

        try {
            const tx = await oftContract.send(sendParam, { nativeFee, lzTokenFee: 0 }, signer.address, {
                value: nativeFee,
            })
            console.log(`Transaction sent. Hash: ${tx.hash}`)
            console.log(`See transaction on LayerZero Scan: https://testnet.layerzeroscan.com/tx/${tx.hash}`)
            await tx.wait()
            console.log('Transaction confirmed')
        } catch (error) {
            // @ts-ignore
            console.error('Transaction failed:', error.message)
            // @ts-ignore
            if (error.data) {
                // @ts-ignore
                console.error('Error data:', error.data)
            }
        }
    })

// Set your preferred authentication method
//
// If you prefer using a mnemonic, set a MNEMONIC environment variable
// to a valid mnemonic
const MNEMONIC = process.env.MNEMONIC

// If you prefer to be authenticated using a private key, set a PRIVATE_KEY environment variable
const PRIVATE_KEY = process.env.PRIVATE_KEY

const accounts: HttpNetworkAccountsUserConfig | undefined = MNEMONIC
    ? { mnemonic: MNEMONIC }
    : PRIVATE_KEY
      ? [PRIVATE_KEY]
      : undefined

if (accounts == null) {
    console.warn(
        'Could not find MNEMONIC or PRIVATE_KEY environment variables. It will not be possible to execute transactions in your example.'
    )
}

const config: HardhatUserConfig = {
    paths: {
        cache: 'cache/hardhat',
    },
    solidity: {
        compilers: [
            {
                version: '0.8.22',
                settings: {
                    optimizer: {
                        enabled: true,
                        runs: 200,
                    },
                },
            },
        ],
    },
    networks: {
        'kairos-testnet': {
            eid: EndpointId.KLAYTN_V2_TESTNET,
            url: process.env.RPC_URL_KAIROS || 'https://public-en-kairos.node.kaia.io',
            accounts,
        },
        'base-sep-testnet': {
            eid: EndpointId.BASESEP_V2_TESTNET,
            url: process.env.RPC_URL_BASE_SEP || 'https://base-sepolia.blockpi.network/v1/rpc/public',
            accounts,
        },
    },
    namedAccounts: {
        deployer: {
            default: 0, // wallet address of index[0], of the mnemonic in .env
        },
    },
}

export default config
