const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");
const BUY = 0;
const SELL = 1;


//The user must have ETH deposited such that deposited eth >= buy order value
contract("Dex", accounts => {
    let linkTicker = web3.utils.fromUtf8("LINK");
    it("Should enough ethereum to perform buy order", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let balance = await web3.eth.getBalance(accounts[0]);
        //console.log(await dex.getContractBalance());
        //console.log(balance);
        await truffleAssert.reverts(
            dex.createLimitOrder(BUY, linkTicker, 10, 1, {from: accounts[0]})
        )
        
        await dex.depositEth({value: 10});
        console.log(await web3.eth.getBalance(accounts[0]));
        await truffleAssert.passes(
            dex.createLimitOrder(BUY, linkTicker, 10, 1, {from: accounts[0]})
        )
    });
    //The user must have enough tokens deposited such that token balance >= sell order amount 
    it("Should enough token balance to perform sell order", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        
        await truffleAssert.reverts(
            dex.createLimitOrder(SELL, linkTicker, 10, 1)
        )

        await dex.addToken(linkTicker, link.address, {from: accounts[0]})
        await link.approve(dex.address, 10)
        await dex.deposit(10, linkTicker)
        
        await truffleAssert.passes(
            dex.createLimitOrder(SELL, linkTicker, 10, 1)
        )
    });
    //The BUY order book should be ordered on price from highest to lowest starting at index 0
    it("The buy order should have orderbook from lowest to highest starting at index 0", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let orderTestCase = [53, 12, 6, 3, 44, 2, 3];
        let testCasesLength = orderTestCase.length;

        await link.approve(dex.address, 500);
        await dex.depositEth({value: 3000});
        
        let orderBook = await dex.getOrderBook(linkTicker, BUY);

        //Adding to test cases orders from previous tests
        for(let i=0; i<orderBook.length; i++){
            orderTestCase.push(Number(orderBook[i].price));
        }

        //Limit orders
        for(let i=0; i<testCasesLength; i++){
            await dex.createLimitOrder(BUY, linkTicker, 1, orderTestCase[i]);
            //orderBook = await dex.getOrderBook(linkTicker, BUY); - for debugging
            //console.log(orderBook);
        }
        orderBook = await dex.getOrderBook(linkTicker, BUY);

        //Assertions
        sortedOrder = orderTestCase.sort(function(a, b){return a-b});
        console.log(sortedOrder);
        for(let i=0; i<orderBook.length; i++){
            await assert.equal(sortedOrder[i], orderBook[i].price);
        }
    });

    it("The sell order should have orderbook from lowest to highest starting at index 0", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let orderTestCase = [53, 12, 6, 3, 44, 2, 3];
        let testCasesLength = orderTestCase.length;

        await link.approve(dex.address, 500);
        await dex.depositEth({value: 3000});
        
        let orderBook = await dex.getOrderBook(linkTicker, SELL);

        //Adding to test cases orders from previous tests
        for(let i=0; i<orderBook.length; i++){
            orderTestCase.push(Number(orderBook[i].price));
        }

        //Limit orders
        for(let i=0; i<testCasesLength; i++){
            await dex.createLimitOrder(SELL, linkTicker, 1, orderTestCase[i]);
            //orderBook = await dex.getOrderBook(linkTicker, SELL); //- for debugging
            //console.log(orderBook);
        }
        orderBook = await dex.getOrderBook(linkTicker, SELL);

        //Assertions
        sortedOrder = orderTestCase.sort(function(a, b){return b-a});
        //console.log(orderBook);
        console.log(sortedOrder);
        for(let i=0; i<orderBook.length; i++){
            await assert.equal(sortedOrder[i], orderBook[i].price);
        }
    });
});