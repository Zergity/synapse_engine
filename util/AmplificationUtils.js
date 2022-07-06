const connect = require("../src/connect")
exports.A_PRECISION = 100

/**
 * @notice Return A in its raw precision
 * @dev See the StableSwap paper for details
 * @param self Swap struct to read from
 * @return A parameter in its raw precision form
 */
exports._getAPrecise = async (self) => {
  let block = await connect.getBlock()
  let t1 = self.futureATime; // time when ramp is finished
  let a1 = self.futureA; // final A value when ramp is finished

  if (block.timestamp < t1) {
    let t0 = self.initialATime; // time when ramp is started
    let a0 = self.initialA; // initial A value when ramp is started
    if (a1 > a0) {
      // a0 + (a1 - a0) * (block.timestamp - t0) / (t1 - t0)
      let result =
        BigNumber(a0).add(
          BigNumber(a1).sub(a0).mul(BigNumber(block.timestamp).sub(t0)).div(t1.sub(t0))
        );
      return result
    } else {
      // a0 - (a0 - a1) * (block.timestamp - t0) / (t1 - t0)
      let result =
        a0.sub(
          a0.sub(a1).mul(block.timestamp.sub(t0)).div(t1.sub(t0))
        );
      return result
    }
  } else {
    return a1
  }
}
