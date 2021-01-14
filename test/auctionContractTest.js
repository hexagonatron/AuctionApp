const AuctionContract = artifacts.require("./AuctionContract.sol");

const ethToWei = num => num * 18;

contract("AuctionContract", accounts => {
  it("should initialise the contract", async () => {
    const auctionInstance = await AuctionContract.deployed();
    
    const itemCount = await auctionInstance.itemCount.call();
    
    assert.equal(itemCount, 0, "The initial itemCount was not 0");
  });
  
  it("should add a listing and check all the values", async () => {
    const auctionInstance = await AuctionContract.deployed();
    
    const receipt = await auctionInstance.addListing("A Potato", 120);

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

    const bidMappingValue = await auctionInstance.getTotalBid(0, bidder);

    assert.equal(bidMappingValue, ethToWei(1), "The value stored in the bid mapping should be 1");

  })
});
