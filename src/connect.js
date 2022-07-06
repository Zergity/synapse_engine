const {ethers} = require("ethers")
const synapse_abi = require("../abi/synapseAbi.json")
require("dotenv").config();

const url = 'https://speedy-nodes-nyc.moralis.io/8dd2bdba82ffb069e62a059d/bsc/mainnet'

const provider = new ethers.providers.JsonRpcProvider(url)

exports.getBlock = async () => {
    let block = await provider.getBlock()
    return block
}

exports.synapse_contract = new ethers.Contract(process.env.SYNAPSE_ADDRESS, synapse_abi, provider)
