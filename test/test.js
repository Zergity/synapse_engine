const swapUtils = require('../util/swapUtils')
const expect = require('chai').expect;
const data =    {
                    initialA: '50000',
                    futureA: '100000',
                    initialATime: '1641351112',
                    futureATime: '1642668591',
                    swapFee: '1000000',
                    adminFee: '6000000000',
                    lpToken: '0xa4b7Bc06EC817785170C2DbC1dD3ff86CDcdcc4C',
                    balances: [
                    '1000000000000000000',
                    '1000000000000000000',
                    '1000000000000000000',
                    '1000000000000000000'
                    ],
                    tokenPrecisionMultipliers: [ '1', '1', '1', '1' ]
                }
describe('Swap', function () {
    it('Succeeds with expected swap amounts',  async() => {
        let result = await (await swapUtils.calculateSwap(data, 0, 1, String(1e17))).toString()
        console.log(result)
        expect(result).to.equal('99979911322743161');
    });
});
