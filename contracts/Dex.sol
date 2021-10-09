pragma solidity ^0.8.0;
pragma experimental ABIEncoderV2;

import "./Wallet.sol";

contract Dex is Wallet {
    using SafeMath for uint256;

    enum Side{
        BUY,
        SELL
    }

    struct Order {
        uint id;
        address trader;
        Side side;
        bytes32 ticker;
        uint amount;
        uint price;
        uint filled;
    }

    uint public nextOrderId = 0;

    mapping(bytes32 => mapping(uint => Order[])) orderBook;

    function getOrderBook(bytes32 ticker, Side side) view public returns(Order[] memory){
        return orderBook[ticker][uint(side)];
    }    
    
    function createLimitOrder(Side side, bytes32 ticker, uint tokenAmount, uint price) public {
        Order[] storage orders = orderBook[ticker][uint(side)];
        if(side == Side.BUY){
            require(tokenAmount * price <= balances[msg.sender]["ETH"], "You do not have enough ETH to create an order");  
        }
        else if(side == Side.SELL) {
            require(tokenAmount <= balances[msg.sender][ticker], "You do not have enough tokens to create an order");
        }
        //Bubble sort
        orders.push(Order(nextOrderId, msg.sender, side, ticker, tokenAmount, price, 0)); 
        //_sortOrderBook(ticker, side);
        _sortOrderBook(ticker, side);
        nextOrderId++;
    }

    function createMarketOrder(Side side, bytes32 ticker, uint tokenAmount) public {
        uint orderBookSide; 
        uint totalFilled;
        uint cost;

        if(side == Side.BUY){
            orderBookSide = 1; //SELL
        }
        else{
            require(balances[msg.sender][ticker] >= tokenAmount, "You do not have enough tokens to trade");
            orderBookSide = 0; //BUY
        }
        Order[] storage orders = orderBook[ticker][orderBookSide];
        
        //require(orders.length > 0, "There is not enough liquidity");
        for(uint i = orders.length; (i > 0) && (totalFilled < tokenAmount); i--){
            uint idx = i - 1;
            uint leftToFill = tokenAmount.sub(totalFilled);
            uint availableToFill = orders[idx].amount.sub(orders[idx].filled);
            if(availableToFill > leftToFill){
                orders[idx].filled = orders[idx].filled.add(leftToFill);
            }
            else{ // availableToFill <= leftToFill
                orders[idx].filled = orders[idx].filled.add(availableToFill);
            }
            totalFilled = totalFilled.add(orders[idx].filled);
            cost = orders[idx].filled.mul(orders[idx].price);
            if(Side.BUY == side){
                require(balances[msg.sender]["ETH"] >= cost, "You do not have enough ETH for this trade");                  
                //sender actions
                balances[msg.sender][ticker] = balances[msg.sender][ticker].add(orders[idx].filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].sub(cost);
                //trader actions
                balances[orders[idx].trader][ticker] = balances[orders[idx].trader][ticker].sub(orders[idx].filled);
                balances[orders[idx].trader]["ETH"] = balances[orders[idx].trader]["ETH"].add(cost);
            }
            else{
                //sender actions
                balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(orders[idx].filled);
                balances[msg.sender]["ETH"] = balances[msg.sender]["ETH"].add(cost);
                //trader actions
                balances[orders[idx].trader][ticker] = balances[orders[idx].trader][ticker].add(orders[idx].filled);
                balances[orders[idx].trader]["ETH"] = balances[orders[idx].trader]["ETH"].sub(cost);
            }
            if(orders.length > 0 && orders[idx].filled == orders[idx].amount){
                orders.pop();
            }
            else if(orders[idx].filled != orders[idx].amount){
                assert(orders[idx].filled == leftToFill); // There are some exploits in calculations
            }
            else{
                assert(orders.length == 0);
            }
        }
        /*//Remove 100% filled orders from the orderbook
        while(orders.length > 0 && orders[0].filled == orders[0].amount){
            //Remove the top element in the orders array by overwriting every element
            // with the next element in the order list
            for (uint256 i = 0; i < orders.length - 1; i++) {
                orders[i] = orders[i + 1];
            }
            orders.pop();
        }*/
    }

    function getEthDexBalance() view public returns(uint){
        return balances[msg.sender]["ETH"];
    }

    function _sortOrderBook(bytes32 ticker, Side side) private {
        Order[] storage orders = orderBook[ticker][uint(side)];
        Order memory tmpOrder;
        if(side == Side.BUY){
            for(uint i=0; i<orders.length-1; i++){
                for(uint j=i+1; j<orders.length; j++){
                    if(orders[i].price > orders[j].price){
                        tmpOrder = orders[i];
                        orders[i] = orders[j];
                        orders[j] = tmpOrder;
                    }
                }
            }
        }
        else if(side == Side.SELL)
        {
            for(uint i=0; i<orders.length-1; i++){
                for(uint j=i+1; j<orders.length; j++){
                    if(orders[i].price < orders[j].price){
                        tmpOrder = orders[i];
                        orders[i] = orders[j];
                        orders[j] = tmpOrder;
                    }
                }
            }
        }
    }
    function _sortOrderBookIvans(bytes32 ticker, Side side) private {
        Order[] storage orders = orderBook[ticker][uint(side)];
        Order memory tmpOrder;
        uint i = orders.length > 0 ? orders.length - 1 : 0;

        if(side == Side.BUY){
            while(i > 0){
                if(orders[i-1].price > orders[i].price){
                    break;
                }
                tmpOrder = orders[i-1];
                orders[i-1] = orders[i];
                orders[i] = tmpOrder;
                i--;
            }
        }
        else if(side == Side.SELL){
            while(i > 0){
                if(orders[i-1].price < orders[i].price){
                    break;
                }
                tmpOrder = orders[i-1];
                orders[i-1] = orders[i];
                orders[i] = tmpOrder;
                i--;
            }
        }
        
    }
}
