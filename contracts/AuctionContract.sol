// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.9.0;

contract AuctionContract {
    struct AuctionItem {
        uint highestBid;
        address highestBidderAddress;
        address lister;
        string itemName;
        uint auctionEnd;
    }

    uint public itemCount;
    mapping(uint => AuctionItem) public auctionItems;

    function addListing(string memory _itemName, uint _auctionDuration) public {
        auctionItems[itemCount] = AuctionItem(
            0,
            msg.sender,
            msg.sender,
            _itemName,
            block.timestamp + _auctionDuration
        );

        itemCount += 1;
    }

    function placeBid(uint _itemId) public payable {
      require(_itemId >= 0);
      require(_itemId < itemCount);
      require(auctionItems[_itemId].auctionEnd > block.timestamp);
      require(auctionItems[_itemId].highestBid < msg.value);

      auctionItems[_itemId].highestBid = msg.value;
      auctionItems[_itemId].highestBidderAddress = msg.sender;
    }
}
