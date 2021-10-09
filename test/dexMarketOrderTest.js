const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const truffleAssert = require("truffle-assertions");
const BUY = 0;
const SELL = 1;


//The user must have ETH deposited such that deposited eth >= buy order value
contract("Dex", accounts => {
    let linkTicker = web3.utils.fromUtf8("LINK");
    //TestCase 1
    it("TC1: Should have enough ethereum to perform buy order", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        assert.equal(0, balance.toNumber(), "Initial ETH balance is not zero");
    
        //Check liquidity error (for now passes)
        await truffleAssert.passes(
            dex.createMarketOrder(BUY, linkTicker, 10, {from: accounts[0]})
        )
        //Check too low amount of ETH error
        await dex.addToken(linkTicker, link.address, {from: accounts[0]});
        await link.transfer(accounts[1], 10, {from: accounts[0]});
        await link.approve(dex.address, 10, {from: accounts[1]});
        await dex.deposit(10, linkTicker, {from: accounts[1]});
        
        await dex.createLimitOrder(SELL, linkTicker, 10, 1, {from: accounts[1]});
        //For debugging
        console.log("ETH BALANCE (before): " + balance.toNumber());
        //console.log(await dex.getOrderBook(linkTicker, SELL));
        //console.log(await dex.getOrderBook(linkTicker, BUY));

        await truffleAssert.reverts(
            dex.createMarketOrder(BUY, linkTicker, 10, {from: accounts[0]})
        );
            
        await dex.depositEth({value: 10});
        //For debugging
        balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

        /*let orderBook = await dex.getOrderBook(linkTicker, SELL)
        console.log(await dex.getOrderBook(linkTicker, SELL));
        console.log(orderBook[0].price * orderBook[0].amount);*/
        console.log("ETH BALANCE (after deposit): " + balance.toNumber());
        
        await truffleAssert.passes(
            dex.createMarketOrder(BUY, linkTicker, 10, {from: accounts[0]})
        )
        balance = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        //console.log(await dex.getOrderBook(linkTicker, SELL));
        console.log("ETH BALANCE (after market order): " + balance.toNumber());
    });
    //TestCase 2
    it("TC2: Should have enough token balance to perform sell order", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let balance = await dex.balances(accounts[2], linkTicker);

        assert.equal(balance.toNumber(), 0, balance, "Initial LINK balance is not zero");

        //Check liquidity error
        await truffleAssert.reverts(
            dex.createMarketOrder(SELL, linkTicker, 10, {from: accounts[1]})
        );
        
        await dex.addToken(linkTicker, link.address, {from: accounts[0]});
        await link.transfer(accounts[2], 10, {from: accounts[0]});
        await link.approve(dex.address, 10, {from: accounts[0]});
        await link.approve(dex.address, 10, {from: accounts[2]});
        await dex.deposit(10, linkTicker, {from: accounts[0]});
        //console.log(await dex.balances(accounts[1],web3.utils.fromUtf8("ETH")));
        //await dex.depositEth({value: 10, from: accounts[1]});
        console.log(await dex.balances(accounts[1],web3.utils.fromUtf8("ETH")));
        console.log(await dex.balances(accounts[2],linkTicker));
        await dex.createLimitOrder(BUY, linkTicker, 10, 1, {from: accounts[1]});

        await truffleAssert.reverts(
            dex.createMarketOrder(SELL, linkTicker, 10, {from: accounts[2]})
        );

        await dex.deposit(10, linkTicker, {from: accounts[2]});
        
        await truffleAssert.passes(
            dex.createMarketOrder(SELL, linkTicker, 10)
        );
    });
    //When creating a SELL market order, the seller needs to have enough tokens for the trade
    it("TC3: Should throw an error when creating a sell market order without adequate token balance", async () => {
        let dex = await Dex.deployed()

        let balance = await dex.balances(accounts[3], linkTicker)
        assert.equal( balance.toNumber(), 0, "Initial LINK balance is not 0" );
        
        await truffleAssert.reverts(
            dex.createMarketOrder(1, linkTicker, 10, {from: accounts[3]})
        )
    })
    //Market orders can be submitted even if the order book is empty
    it("TC4: Market orders can be submitted even if the order book is empty", async () => {
        let dex = await Dex.deployed()
        
        await dex.depositEth({value: 50000});

        let orderbook = await dex.getOrderBook(linkTicker, 0); //Get buy side orderbook
        assert(orderbook.length == 0, "Buy side Orderbook length is not 0");
        
        await truffleAssert.passes(
            dex.createMarketOrder(0, linkTicker, 10)
        )
    })
    //Market orders should be filled until the order book is empty or the market order is 100% filled
    it("TC5: Market orders should not fill more limit orders than the market order amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await dex.addToken(linkTicker, link.address)


        //Send LINK tokens to accounts 1, 2, 3 from account 0
        await link.transfer(accounts[1], 150)
        await link.transfer(accounts[2], 150)
        await link.transfer(accounts[3], 150)

        //Approve DEX for accounts 1, 2, 3
        await link.approve(dex.address, 50, {from: accounts[1]});
        await link.approve(dex.address, 50, {from: accounts[2]});
        await link.approve(dex.address, 50, {from: accounts[3]});

        //Deposit LINK into DEX for accounts 1, 2, 3
        await dex.deposit(50, linkTicker, {from: accounts[1]});
        await dex.deposit(50, linkTicker, {from: accounts[2]});
        await dex.deposit(50, linkTicker, {from: accounts[3]});

        //Fill up the sell order book
        await dex.createLimitOrder(1, linkTicker, 5, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, linkTicker, 5, 400, {from: accounts[2]})
        await dex.createLimitOrder(1, linkTicker, 5, 500, {from: accounts[3]})

        orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        //console.log(orderbook);
        //Create market order that should fill 2/3 orders in the book
        await dex.createMarketOrder(0, linkTicker, 10);

        orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        //console.log(orderbook);
        assert(orderbook.length == 1, "Sell side Orderbook should only have 1 order left");
        assert(orderbook[0].filled == 0, "Sell side order should have 0 filled");

    })
    //Market orders should be filled until the order book is empty or the market order is 100% filled
    it("TC6: Market orders should be filled until the order book is empty", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        assert(orderbook.length == 1, "Sell side Orderbook should have 1 order left");

        //Fill up the sell order book again
        await dex.createLimitOrder(1, linkTicker, 5, 400, {from: accounts[1]})
        await dex.createLimitOrder(1, linkTicker, 5, 500, {from: accounts[2]})

        //check buyer link balance before link purchase
        let balanceBefore = await dex.balances(accounts[0], linkTicker)
        //console.log(balanceBefore);

        //Create market order that could fill more than the entire order book (15 link)
        await dex.createMarketOrder(0, linkTicker, 50);

        //check buyer link balance after link purchase
        let balanceAfter = await dex.balances(accounts[0], linkTicker)
        //console.log(balanceAfter);
        
        //Buyer should have 15 more link after, even though order was for 50. 
        assert.equal(balanceBefore.toNumber() + 15, balanceAfter.toNumber());
    })

    //The eth balance of the buyer should decrease with the filled amount
    it("TC7: The eth balance of the buyer should decrease with the filled amount", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        //Seller deposits link and creates a sell limit order for 1 link for 300 wei
        await link.approve(dex.address, 500, {from: accounts[1]});
        await dex.createLimitOrder(1, linkTicker, 1, 300, {from: accounts[1]})

        //Check buyer ETH balance before trade
        let balanceBefore = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));
        await dex.createMarketOrder(0, linkTicker, 1);
        let balanceAfter = await dex.balances(accounts[0], web3.utils.fromUtf8("ETH"));

        assert.equal(balanceBefore.toNumber() - 300, balanceAfter.toNumber());
    })

    //The token balances of the limit order sellers should decrease with the filled amounts.
    it("TC8: The token balances of the limit order sellers should decrease with the filled amounts.", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()

        let orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        //Seller Account[2] deposits link
        await link.approve(dex.address, 500, {from: accounts[2]});
        await dex.deposit(100, linkTicker, {from: accounts[2]});

        await dex.createLimitOrder(1, linkTicker, 1, 300, {from: accounts[1]})
        await dex.createLimitOrder(1, linkTicker, 1, 400, {from: accounts[2]})

        //Check sellers Link balances before trade
        let account1balanceBefore = await dex.balances(accounts[1], linkTicker);
        let account2balanceBefore = await dex.balances(accounts[2], linkTicker);

        //Account[0] created market order to buy up both sell orders
        await dex.createMarketOrder(0, linkTicker, 2);

        //Check sellers Link balances after trade
        let account1balanceAfter = await dex.balances(accounts[1], linkTicker);
        let account2balanceAfter = await dex.balances(accounts[2], linkTicker);

        assert.equal(account1balanceBefore.toNumber() - 1, account1balanceAfter.toNumber());
        assert.equal(account2balanceBefore.toNumber() - 1, account2balanceAfter.toNumber());
    })

    //Filled limit orders should be removed from the orderbook
    it("TC9: Filled limit orders should be removed from the orderbook", async () => {
        let dex = await Dex.deployed()
        let link = await Link.deployed()
        await dex.addToken(linkTicker, link.address)

        //Seller deposits link and creates a sell limit order for 1 link for 300 wei
        await link.approve(dex.address, 500);
        await dex.deposit(50, linkTicker);
        
        await dex.depositEth({value: 10000});

        let orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook

        await dex.createLimitOrder(1, linkTicker, 4, 300)
        await dex.createMarketOrder(0, linkTicker, 4);

        orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty after trade");
    })

    //Partly filled limit orders should be modified to represent the filled/remaining amount
    it("TC10: Limit orders filled property should be set correctly after a trade", async () => {
        let dex = await Dex.deployed()

        let orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        assert(orderbook.length == 0, "Sell side Orderbook should be empty at start of test");

        await dex.createLimitOrder(1, linkTicker, 5, 300, {from: accounts[1]});
        orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        //console.log(orderbook);
        await dex.createMarketOrder(0, linkTicker, 2);
        orderbook = await dex.getOrderBook(linkTicker, 1); //Get sell side orderbook
        //console.log(orderbook);
        assert.equal(orderbook[orderbook.length-1].filled, 2);
        assert.equal(orderbook[orderbook.length-1].amount, 5);
    })
    //When creating a BUY market order, the buyer needs to have enough ETH for the trade
    it("TC11: Should throw an error when creating a buy market order without adequate ETH balance", async () => {
        let dex = await Dex.deployed()
        
        let balance = await dex.balances(accounts[4], web3.utils.fromUtf8("ETH"))
        assert.equal( balance.toNumber(), 0, "Initial ETH balance is not 0" );
        await dex.createLimitOrder(1, linkTicker, 5, 300, {from: accounts[1]})

        await truffleAssert.reverts(
            dex.createMarketOrder(0, linkTicker, 5, {from: accounts[4]})
        )
    })
    /*//TestCase 3
    it("TC3: Should be submitted even if order book is empty", async () => {
        let dex = await Dex.deployed();

        await dex.depositEth({value: 10});
        let orderBook = await dex.getOrderBook(linkTicker, BUY);
        assert(orderBook.length == 0, "Buy side order book must be empty");
        
        await truffleAssert.passes(
            dex.createMarketOrder(BUY, linkTicker, 10)
        )
    });
    //TestCase 4
    it("TC4: If there is enough liquidity in order book, market orders should be filled in 100%", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let sellOrderBook = await dex.getOrderBook(linkTicker, SELL);

        assert(sellOrderBook.length == 0, "Sell side order book must be empty");
        
        await dex.addToken(linkTicker, link.address, {from: accounts[0]});
        await link.approve(dex.address, 10, {from: accounts[0]});
        
        await dex.deposit(10, linkTicker, {from: accounts[0]});
        
        await dex.depositEth({from: accounts[1], value: 21});
        console.log("ETH DEX balance: " + await dex.balances(accounts[1], web3.utils.fromUtf8("ETH")));
        await dex.createLimitOrder(BUY, linkTicker, 5, 1, {from: accounts[1]});
        await dex.createLimitOrder(BUY, linkTicker, 8, 2, {from: accounts[1]});
        let buyOrderBook = await dex.getOrderBook(linkTicker, BUY);
        assert(buyOrderBook.length == 2, "Buy side order book must have 2 elements");
        await truffleAssert.passes(
            dex.createMarketOrder(SELL, linkTicker, 10, {from: accounts[0]})
        )
        assert(buyOrderBook.length == 1, "Buy side order book must have 1 element");
    });
    //TestCase 5
    it("TC5: Market order should fill exact amount of tokens if liquidity is enough", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let buyOrderBook = await dex.getOrderBook(linkTicker, BUY);
        
        //Tokens are added to contract in test case 4
        let balance0 = await link.balanceOf(accounts[0]);
        let balance1 = await link.balanceOf(accounts[1]);
        //console.log(balance0)
        //console.log(balance1)

        //Transfering tokens
        await link.transfer(accounts[1], 15, {from: accounts[0]});
        await link.transfer(accounts[2], 15, {from: accounts[0]});
        await link.transfer(accounts[3], 15, {from: accounts[0]});
        balance0 = await link.balanceOf(accounts[0]);
        balance1 = await link.balanceOf(accounts[1]);
        //console.log(balance0)
        //console.log(balance1)

        //Approving tokens
        await link.approve(dex.address, 15, {from: accounts[1]});
        await link.approve(dex.address, 15, {from: accounts[2]});
        await link.approve(dex.address, 15, {from: accounts[3]});
        //Depositing tokens
        await dex.deposit(15, linkTicker, {from: accounts[1]});
        await dex.deposit(15, linkTicker, {from: accounts[2]});
        await dex.deposit(15, linkTicker, {from: accounts[3]});
        await dex.depositEth({value: 100});
        //Sell limit orders
        await dex.createLimitOrder(SELL, linkTicker, 15, 1, {from: accounts[1]});
        await dex.createLimitOrder(SELL, linkTicker, 15, 6, {from: accounts[2]});
        await dex.createLimitOrder(SELL, linkTicker, 15, 3, {from: accounts[3]});
        
        buyOrderBook = await dex.getOrderBook(linkTicker, SELL);
        assert(buyOrderBook.length == 3, "Buy side order book must have 3 elements");
        let balanceBefore = await dex.balances(accounts[0], linkTicker);
        await dex.createMarketOrder(BUY, linkTicker, 32, {from: accounts[0]});
        let balanceAfter = await dex.balances(accounts[0], linkTicker);
        buyOrderBook = await dex.getOrderBook(linkTicker, SELL);
        assert(buyOrderBook.length == 1, "Buy side order book must have 1 element");
        //assert(buyOrderBook[0].amount == 13, "Must remain 13 tokens which was not sold");
        assert(buyOrderBook[0].filled == 13, "Sell side order should have 0 filled")
        assert.equal(balanceBefore + 32, balanceAfter);
        
    });
    //TestCase 6
    it("TC6: Market order should fill partial amount of tokens if liquidity is NOT enough", async () => {
        let dex = await Dex.deployed();
        let link = await Link.deployed();

        console.log("Token balance (before):" + await link.balanceOf(accounts[1]));
        console.log("Dex balance (before) :" + await dex.balances(accounts[1], linkTicker));
        await link.transfer(accounts[1], 15, {from: accounts[0]});
        await link.transfer(accounts[2], 15, {from: accounts[0]});
        await link.approve(dex.address, 15, {from: accounts[1]});
        await link.approve(dex.address, 15, {from: accounts[2]});
        await dex.deposit(15, linkTicker, {from: accounts[1]});
        await dex.deposit(15, linkTicker, {from: accounts[2]});      
        console.log("Token balance (after) :" + await link.balanceOf(accounts[1]));
        console.log("Dex balance (after) :" + await dex.balances(accounts[1], linkTicker));
        await dex.createLimitOrder(SELL, linkTicker, 5, 1, {from: accounts[1]});
        await dex.createLimitOrder(SELL, linkTicker, 5, 6, {from: accounts[2]});
        
        await dex.depositEth({value: 100});
        let balanceBefore = await dex.balances(accounts[0], linkTicker);
        await dex.createMarketOrder(BUY, linkTicker, 32, {from: accounts[0]});
        let balanceAfter = await dex.balances(accounts[0], linkTicker);
        assert.equal(balanceBefore.toNumber() + 10, balanceAfter.toNumber());
        assert(buyOrderBook[0].filled == 10, "Buy side order should have 20 filled")
    });*/
})