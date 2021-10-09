const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");

contract("Dex", accounts => { // skip allows to skip tests in certain contract
    it("Should only be possible for owner to add tokens", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let linkTicker = web3.utils.fromUtf8("LINK");
        await truffleAssert.passes(
            dex.addToken(linkTicker, link.address, {from: accounts[0]})
        );
        await truffleAssert.reverts(
            dex.addToken(linkTicker, link.address, {from: accounts[1]})
        );
    })
    it("Should handle deposits correctly", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let linkTicker = web3.utils.fromUtf8("LINK");
        await link.approve(dex.address, 100);
        await dex.deposit(100, linkTicker);
        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("LINK"));
        assert.equal(balance.toNumber(), 100);
    })

    it("Should handle deposits from not owner account correctly", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let linkTicker = web3.utils.fromUtf8("LINK");
        await link.approve(dex.address, 100);
        await truffleAssert.reverts(
            dex.deposit(100, linkTicker, {from: accounts[1]})
        );
    })

    it("Should handle too big depostis correctly", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let linkTicker = web3.utils.fromUtf8("LINK");
        await link.approve(dex.address, 100);
        await truffleAssert.reverts(
            dex.deposit(600, linkTicker, {from: accounts[0]})
        );
    })

    it("Should handle faulty withdrawals correctly", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        await truffleAssert.reverts(dex.withdraw(200, web3.utils.fromUtf8("LINK")));
    })

    it("Should handle correct withdrawals correctly", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        await truffleAssert.passes(dex.withdraw(100, web3.utils.fromUtf8("LINK")));
    })

})