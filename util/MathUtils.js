/**
 * @notice Compares a and b and returns true if the difference between a and b
 *         is less than 1 or equal to each other.
 * @param a uint256 to compare with
 * @param b uint256 to compare with
 * @return True if the difference between a and b is less than 1 or equal,
 *         otherwise return false
 */
 exports.within1 = (a, b) => {
    return difference(a, b).lte(1)
}

/**
 * @notice Calculates absolute difference between a and b
 * @param a uint256 to compare with
 * @param b uint256 to compare with
 * @return Difference between a and b
 */
const difference = (a, b) => {
    if (a.gt(b)) {
        return a.sub(b);
    }
    return b.sub(a);
}