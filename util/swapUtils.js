const {ethers} = require("ethers")
const AmplificationUtils = require("./AmplificationUtils.js")
const mathUtil = require("../util/MathUtils")

exports.POOL_PRECISION_DECIMALS = 18
exports.FEE_DENOMINATOR = 10000000000
exports.MAX_SWAP_FEE = 100000000
exports.MAX_ADMIN_FEE = 10000000000
exports.MAX_LOOP_LIMIT = 256

/**
 * @notice Internally calculates a swap between two tokens.
 *
 * @dev The caller is expected to transfer the actual amounts (dx and dy)
 * using the token contracts.
 *
 * @param self Swap struct to read from
 * @param tokenIndexFrom the token to sell
 * @param tokenIndexTo the token to buy
 * @param dx the number of tokens to sell. If the token charges a fee on transfers,
 * use the amount that gets transferred after the fee.
 * @return dy the number of tokens the user will get
 * @return dyFee the associated fee
 */
 exports.calculateSwap = async (self, tokenIndexFrom, tokenIndexTo, dx) => {
    let multipliers = self.tokenPrecisionMultipliers
    let xp = _xp(self.balances, multipliers)
    if (tokenIndexFrom > xp.length && tokenIndexTo > xp.length) {
        throw "Token index out of range"
    }
    // x = the amount of sell token * multipliers (1) + token's balance
    let x = ethers.BigNumber.from(dx).mul(multipliers[tokenIndexFrom]).add(xp[tokenIndexFrom])
    // y = the amount of TO token that should remain in the pool
    let y = getY(await AmplificationUtils._getAPrecise(self), tokenIndexFrom, tokenIndexTo, x, xp)
    // dy = the number of tokens the user will get
    let dy = xp[tokenIndexTo].sub(y).sub(1)
    let dyFee = dy.mul(self.swapFee).div(this.FEE_DENOMINATOR)
    dy = dy.sub(dyFee).div(multipliers[tokenIndexTo])
    return dy.toString()
}

/**
 * @notice Given a set of balances and precision multipliers, return the
 * precision-adjusted balances.
 *
 * @param balances an array of token balances, in their native precisions.
 * These should generally correspond with pooled tokens.
 *
 * @param precisionMultipliers an array of multipliers, corresponding to
 * the amounts in the balances array. When multiplied together they
 * should yield amounts at the pool's precision.
 *
 * @return an array of amounts "scaled" to the pool's precision
 */
const _xp = (balances, precisionMultipliers) => {
    let numTokens = balances.length
    if (numTokens != precisionMultipliers.length) {
        throw "Balances must match multipliers"
    }
    let xp = []
    for (let i = 0; i < numTokens; i++) {
        xp[i] = ethers.BigNumber.from(balances[i]).mul(precisionMultipliers[i])
    }
    return xp
}

/**
 * @notice Calculate the new balances of the tokens given the indexes of the token
 * that is swapped from (FROM) and the token that is swapped to (TO).
 * This function is used as a helper function to calculate how much TO token
 * the user should receive on swap.
 *
 * @param preciseA precise form of amplification coefficient
 * @param tokenIndexFrom index of FROM token
 * @param tokenIndexTo index of TO token
 * @param x the new total amount of FROM token
 * @param xp balances of the tokens in the pool
 * @return the amount of TO token that should remain in the pool
 */
const getY = (preciseA, tokenIndexFrom, tokenIndexTo, x, xp) => {
    let numTokens = xp.length
    if (tokenIndexFrom == tokenIndexTo) {
        throw "Can't compare token to itself"
    }
    if (tokenIndexFrom > numTokens && tokenIndexTo > numTokens) {
        throw "Tokens must be in pool"
    }
    let d = getD(xp, preciseA)
    let c = d
    let s = ethers.BigNumber.from('0')
    let nA = ethers.BigNumber.from(numTokens).mul(preciseA)
    let _x
    for (let i = 0; i < numTokens; i++) {
        if (i == tokenIndexFrom) {
            _x = x
        } else if (i != tokenIndexTo) {
            _x = xp[i]
        } else {
            continue
        }
        s = s.add(_x)
        c = c.mul(d).div(_x.mul(numTokens))
        // If we were to protect the division loss we would have to keep the denominator separate
        // and divide at the end. However this leads to overflow with large numTokens or/and D.
        // c = c * D * D * D * ... overflow!
    }
    c = c.mul(d).mul(AmplificationUtils.A_PRECISION).div(nA.mul(numTokens))
    let b = s.add(d.mul(AmplificationUtils.A_PRECISION).div(nA))
    let yPrev
    let y = d
    // iterative approximation
    for (let i = 0; i < this.MAX_LOOP_LIMIT; i++) {
        yPrev = y
        y = y.mul(y).add(c).div(y.mul(2).add(b).sub(d))
        if (mathUtil.within1(y, yPrev)) {
            return y
        }
    }
    throw "Approximation did not converge"
}

/**
 * @notice Get D, the StableSwap invariant, based on a set of balances and a particular A.
 * @param xp a precision-adjusted set of pool balances. Array should be the same cardinality
 * as the pool.
 * @param a the amplification coefficient * n * (n - 1) in A_PRECISION.
 * See the StableSwap paper for details
 * @return the invariant, at the precision of the pool
 */
const getD = (xp, a) => {
    let numTokens = ethers.BigNumber.from(xp.length)
    let s = ethers.BigNumber.from('0')
    for (let i = 0; i < numTokens; i++) {
        s = s.add(xp[i])
    }
    if (s == 0) {
        return 0
    }

    let prevD
    let d = s
    let nA = ethers.BigNumber.from(a).mul(numTokens);
    for (let i = 0; i < numTokens; i++) {
        let dP = d;
        for (let j = 0; j < numTokens; j++) {
            dP = dP.mul(d).div(xp[j].mul(numTokens))
            // If we were to protect the division loss we would have to keep the denominator separate
            // and divide at the end. However this leads to overflow with large numTokens or/and D.
            // dP = dP * D * D * D * ... overflow!
        }
        prevD = d;
        d = nA
            .mul(s)
            .div(AmplificationUtils.A_PRECISION)
            .add(dP.mul(numTokens))
            .mul(d)
            .div(
                nA
                .sub(AmplificationUtils.A_PRECISION)
                .mul(d)
                .div(AmplificationUtils.A_PRECISION)
                .add(numTokens.add(1).mul(dP))
            );
                if (mathUtil.within1(d, prevD)) {
            return d
        }
    }
    throw "D does not converge"
}
