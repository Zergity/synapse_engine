const {ethers} = require("ethers")
const swapUtils = require("../util/swapUtils")
const Connect = require("../src/connect")
const tokenIndexed = require("../util/tokenIndexed.json")

let precisionMultipliers = []
let SwapData = {}
let initialA
let futureA
let initialATime
let futureATime
let swapFee
let adminFee
let lpToken
let balances = []
let pooledTokens = []
let decimals = []

/**
 * @notice Get tokens data from pool
 */
const getToken = async() => {
    tokenIndexed.tokenIndex.forEach(function (token) {
        pooledTokens.push(token.address)
        decimals.push(token.decimal)
    })
}

/**
 * @notice Get data from Blockchain that need to calculate the swap
 * @param tokenIndexFrom the token to sell
 * @param tokenIndexTo the token to buy
 * @param dx the number of tokens to sell. If the token charges a fee on transfers,
 * use the amount that gets transferred after the fee.
 * @return result the number of tokens the user will get
 */
exports.swap = async (tokenIndexFrom, tokenIndexTo, dx) => {
    await getToken()
    let data = await getDataFromBlockchain()
    let result = await swapUtils.calculateSwap(data, tokenIndexFrom, tokenIndexTo, dx)
    return result
}

/**
 * @notice Get data from Blockchain that need to calculate the swap
 * @return swapData the data that need to calculate the swap
 */
const getDataFromBlockchain = async () => {
    let result = await Connect.synapse_contract.functions.swapStorage()
    let balance0 = await Connect.synapse_contract.functions.getTokenBalance(0)
    let balance1 = await Connect.synapse_contract.functions.getTokenBalance(1)
    let balance2 = await Connect.synapse_contract.functions.getTokenBalance(2)
    let balance3 = await Connect.synapse_contract.functions.getTokenBalance(3)

    initialA = result.initialA.toString()
    futureA = result.futureA.toString()
    initialATime = result.initialATime.toString()
    futureATime = result.futureATime.toString()
    swapFee = result.swapFee.toString()
    adminFee = result.adminFee.toString()
    lpToken = result.lpToken.toString()

    let tokenPrecisionMultipliers = await getTokenPrecisionMultipliers(pooledTokens, decimals)

    balances = [balance0.toString(), balance1.toString(), balance2.toString(), balance3.toString()]
    SwapData = {
        initialA,
        futureA,
        initialATime,
        futureATime,
        swapFee,
        adminFee,
        lpToken,
        balances,
        tokenPrecisionMultipliers
    }
    return SwapData
}

/**
 * @notice Get the array of precision Multipliers
 * @param _pooledTokens array of tokens address
 * @param decimals array of tokens decimals
 * @return precisionMultipliers precision Multipliers of token decimals
 */
const getTokenPrecisionMultipliers = async (_pooledTokens, decimals) => {
    if (_pooledTokens.length < 1) {
        throw "_pooledTokens.length <= 1"
    }
    if (_pooledTokens.length >= 32) {
        throw "_pooledTokens.length > 32"
    }
    if (_pooledTokens.length != decimals.length) {
        throw "pooledTokens decimals mismatch"
    }

    for (let i = 0; i < _pooledTokens.length; i++) {
        if (i > 0) {
            if (_pooledTokens[i] != '0' && _pooledTokens[0] == _pooledTokens[i]) {
                throw "Duplicate tokens"
            }
            if (_pooledTokens[i] == '0') {
                throw "The 0 address isn't an ERC-20"
            }
            if (decimals[i] > swapUtils.POOL_PRECISION_DECIMALS)
                throw "Token decimals exceeds max"
        }
        precisionMultipliers[i] = ethers.BigNumber.from(10).pow(ethers.BigNumber.from(swapUtils.POOL_PRECISION_DECIMALS).sub(decimals[i])).toString()
    }
    return precisionMultipliers
}
