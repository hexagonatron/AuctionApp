const AuctionContract = artifacts.require("./AuctionContract.sol");

const ethToWei = num => num * 10**18;
const weiToEth = num => num / 10**18;

const DEFAULT_GAS_PRICE = 100000000000;

const wait = async (seconds) => {
  return new Promise((resolve, reject) => {
    let counter = 0;
    const interval = setInterval(() => {
      process.stdout.write(".");
      counter++;
      if(counter >= seconds){
        clearInterval(interval);
        process.stdout.write("\n");
        resolve();
      }
    }, 1000)
  })
}

contract("AuctionContract", async accounts => {
  it("should initialise the contract", async () => {
    const auctionInstance = await AuctionContract.deployed();
    
    const itemCount = await auctionInstance.itemCount.call();
    
    assert.equal(itemCount, 0, "The initial itemCount was not 0");
  });
  
  it("should add a listing and check all the values", async () => {
    const auctionInstance = await AuctionContract.deployed();
    
    const receipt = await auctionInstance.addListing("A Potato", 9);
    
    assert.equal(receipt.logs[0].event, "newItemListed", "The 'newItemListed' event should be emitted");
    
    const item = await auctionInstance.auctionItems(0);
    
    assert.equal(item.itemName, "A Potato", "The item name should be 'A Potato'.");
    assert.equal(item.highestBid, 0, "The highest bid should be 0");
    assert.equal(item.highestBidderAddress, "0x0000000000000000000000000000000000000000", "The highest bidder address should be 0x...");
    assert.equal(item.lister, accounts[0], "The lister should be set");
    assert.equal(item.claimed, false, "The item funds should not have already been claimed");
    
    const newCount = await auctionInstance.itemCount();
    
    assert.equal(newCount, 1, "The itemCount should be incremented");
  });
  
  it("Should allow bidding on an item", async () => {
    const auctionInstance = await AuctionContract.deployed();
    
    const bidder = accounts[1];
    
    const receipt = await auctionInstance.placeBid(0, {from: bidder, value: ethToWei(1) });
    
    assert.equal(receipt.logs[0].event, 'newHighestBid', "Should emit the 'newHighestBidder' event.");
    
    const item = await auctionInstance.auctionItems(0);
    
    assert.equal(item.highestBid, ethToWei(1), "Highest bid should be 1 Eth");
    assert.equal(item.highestBidderAddress, bidder, "Highest bidder should be the account that placed the bid.");
    
    const contractTotal = await web3.eth.getBalance(auctionInstance.address);
    
    assert.equal(contractTotal, ethToWei(1), "Contract balance should be 1 eth");
    
    const bidMappingValue = await auctionInstance.getTotalBid(0, bidder);
    
    assert.equal(bidMappingValue, ethToWei(1), "The value stored in the bid mapping should be 1");
    
  });
  
  it("Should not allow a bid if bidding less than current highest bid", async () => {
    const auctionInstance = await AuctionContract.deployed();
    const bidder = accounts[2];
    
    try{
      const receipt = await auctionInstance.placeBid(0, {from: bidder, value: ethToWei(0.5)});
      assert.fail();
    }catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
      assert.equal(error.reason, "There is a higher bidder", "Error message should state there is a higher bidder.")
    }
  });

  it("Should not allow a bid if you're the lister", async () => {
    const auctionInstance = await AuctionContract.deployed();
    const bidder = accounts[0];

    try{
      const receipt = await auctionInstance.placeBid(0, {from: bidder, value: ethToWei(2)});
      assert.fail();
    }catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Error message must contain revert");
      assert.equal(error.reason, "Can't bid on an item you listed", "Error message should state you can't bid on an item you listed");
    }

  });

  it("Should allow another bidder to outbid the current highest bidder", async () => {
    const auctionInstance = await AuctionContract.deployed();
    const bidder = accounts[2];

    const receipt = await auctionInstance.placeBid(0, {from: bidder, value: ethToWei(2) });
    
    assert.equal(receipt.logs[0].event, 'newHighestBid', "Should emit the 'newHighestBidder' event.");
    
    const item = await auctionInstance.auctionItems(0);
    
    assert.equal(item.highestBid, ethToWei(2), "Highest bid should be 2 Eth");
    assert.equal(item.highestBidderAddress, bidder, "Highest bidder should be the account that placed the bid.");
    
    const contractTotal = await web3.eth.getBalance(auctionInstance.address);
    
    assert.equal(contractTotal, ethToWei(3), "Contract balance should be 3 eth");
    
    const bidMappingValue = await auctionInstance.getTotalBid(0, bidder);
    
    assert.equal(bidMappingValue, ethToWei(2), "The value stored in the bid mapping should be 2");
  });

  it("Should allow the original bidder to increase their bid by adding more funds", async () => {
    const auctionInstance = await AuctionContract.deployed();
    
    const bidder = accounts[1];
    
    const receipt = await auctionInstance.placeBid(0, {from: bidder, value: ethToWei(2) });
    
    assert.equal(receipt.logs[0].event, 'newHighestBid', "Should emit the 'newHighestBidder' event.");
    
    const item = await auctionInstance.auctionItems(0);
    
    assert.equal(item.highestBid, ethToWei(3), "Highest bid should be 3 Eth");
    assert.equal(item.highestBidderAddress, bidder, "Highest bidder should be the account that placed the bid.");
    
    const contractTotal = await web3.eth.getBalance(auctionInstance.address);
    
    assert.equal(contractTotal, ethToWei(5), "Contract balance should be 5 eth");
    
    const bidMappingValue = await auctionInstance.getTotalBid(0, bidder);
    
    assert.equal(bidMappingValue, ethToWei(3), "The value stored in the bid mapping should be 3");
  });

  it("Should not allow withdrawal of funds until the auction is over", async () => {
    const auctionInstance = await AuctionContract.deployed();
    
    try{
      const receipt = await auctionInstance.withdraw(0, {from: accounts[0]});
      assert.fail("Should not allow withdrawals by lister while auction ongoing");
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, "Error message should contain revert");
      assert.equal(error.reason, "Auction hasn't ended", "Error reason should state that the auction hasn't ended.");
    }
  });

  it("Should allow withdrawal of funds if you're not the highest bidder", async () => {
    const auctionInstance = await AuctionContract.deployed();
    const withdrawer = accounts[2];
    const withdrawerBal = await web3.eth.getBalance(withdrawer);
    
    const balanceAvailable = await auctionInstance.getTotalBid(0, withdrawer);
    
    assert.equal(balanceAvailable, ethToWei(2), "Balance available for withdrawal should be 2 eth");
    
    const receipt = await auctionInstance.withdraw(0, {from: withdrawer, gasPrice: DEFAULT_GAS_PRICE });
    const txCost = receipt.receipt.cumulativeGasUsed * DEFAULT_GAS_PRICE;
    const expectedNewBalance = Number(BigInt(withdrawerBal) + BigInt(ethToWei(2)) - BigInt(txCost));
    // console.log({expectedNewBalance, withdrawerBal, txCost})

    const newWithdrawerBal = await web3.eth.getBalance(withdrawer);

    assert.equal(newWithdrawerBal, expectedNewBalance, "Balance of withdrawer should be 2 eth greater");

    const balanceAvailableAfter = await auctionInstance.getTotalBid(0, withdrawer);
    assert.equal(balanceAvailableAfter, 0, "After withdrawal balance available should be 0");
  });

  it("Should not allow withdrawal if you're the highest bidder", async () => {
    const auctionInstance = await AuctionContract.deployed();

    const withdrawer = accounts[1];
    
    const balanceAvailable = await auctionInstance.getTotalBid(0, withdrawer);
    assert.equal(balanceAvailable, ethToWei(3), "There should be a 3 eth available for withdrawal");

    try{
      await auctionInstance.withdraw(0,{from: withdrawer});
      assert.fail("Should not allow withdrawal from the highest bidder");
    } catch(error) {
      assert(error.message.indexOf("revert") >= 0, "The error message should contain revert");
      assert.equal(error.reason, "Can't withdraw while highest bidder", "Error message should give a reason for withdraw fail.");
    }
  });

  it("Should not allow bidding after the auction has ended", async () => {
    const auctionInstance = await AuctionContract.deployed();
    const item = await auctionInstance.auctionItems(0);
    const itemEndTime = item.auctionEnd.toNumber();
    const currentTime = Math.floor(new Date().getTime() / 1000);
    const secondsToWait = itemEndTime - currentTime + 1;
    console.log(`Waiting ${secondsToWait} seconds for auction to end`);
    await wait(secondsToWait);

    try{
      await auctionInstance.placeBid(0, {from: accounts[4], value: ethToWei(5)});
      assert.fail("Placing a bid should fail after auction has ended");
    } catch (error) {
      assert(error.message.indexOf("revert") >= 0, "The tx should be reverted");
      assert.equal(error.reason, "Auction has ended", "Error message should say that the auction has ended.");
    }

  });

  it("Should allow withdrawal after the auction has finished by the lister", async () => {
    const auctionInstance = await AuctionContract.deployed();
    const lister = accounts[0];
    
    const existingBal = await web3.eth.getBalance(lister);
    const receipt = await auctionInstance.withdraw(0, {from: lister, gasPrice: DEFAULT_GAS_PRICE});
    const txCost = receipt.receipt.cumulativeGasUsed * DEFAULT_GAS_PRICE;
    const expectedNewBal = Number(BigInt(existingBal) + BigInt(ethToWei(3)) - BigInt(txCost));
    const actualBal = await web3.eth.getBalance(lister);
    
    assert.equal(actualBal, expectedNewBal, "The new balance should have increased by 3 eth");
    
    const item = await auctionInstance.auctionItems(0);
    assert.equal(item.claimed, true, "The item should have the funds marked as claimed");
  });
  
  it("Should not allow withdrawal on an item that's already claimed", async () => {
    const auctionInstance = await AuctionContract.deployed();
    const lister = accounts[0];
    try{
      const receipt = await auctionInstance.withdraw(0, {from: lister, gasPrice: DEFAULT_GAS_PRICE});
      assert.fail("Should not allow withdrawal of funds if the funds have been claimed");
    } catch(error) {
      assert(error.message.indexOf("revert") >= 0, "The tx should be reverted");
      assert.equal(error.reason, "Auction funds already claimed", "The error message should read that the funds have already been claimed.");
    }
  });
  
  it("Should not allow any actions on an invalid item", async () => {
    const auctionInstance = await AuctionContract.deployed();

    try{
      await auctionInstance.placeBid(4, {from: accounts[3], value: ethToWei(3)});
      assert.fail("Should not allow placing a bid on an invalid item");
    } catch(error) {
      assert(error.message.includes("revert"), "Tx should be reverted");
      assert.equal(error.reason, "Invalid item Id");
    }

    try{
      await auctionInstance.withdraw(4);
      assert.fail("Should not allow withdrawing on an invalid item");
    } catch(error) {
      assert(error.message.includes("revert"), "Tx should be reverted");
      assert.equal(error.reason, "Invalid item Id");
    }
  })
});
