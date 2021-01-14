// SPDX-License-Identifier: MIT
pragma solidity >=0.4.21 <0.9.0;

contract AuctionContract {
    struct AuctionItem {
        uint highestBid;
        address highestBidderAddress;
        mapping(address => uint) bids;
        address payable lister;
        string itemName;
        uint auctionEnd;
        bool claimed;
    }

    uint public itemCount;
    mapping(uint => AuctionItem) public auctionItems;

    event newItemListed(address indexed lister, string indexed itemName, uint indexed itemId, uint endTime);

    event newHighestBid(uint indexed itemId, address indexed bidder, uint newHighestBid );

    function addListing(string memory _itemName, uint _auctionDuration) public {
        AuctionItem storage item = auctionItems[itemCount];
        item.highestBid = 0;
        item.lister = msg.sender;
        item.itemName = _itemName;
        item.auctionEnd = block.timestamp + _auctionDuration;

        emit newItemListed(msg.sender, _itemName, itemCount, item.auctionEnd);
        
        itemCount += 1;
    }

    function placeBid(uint _itemId) public payable {
      AuctionItem storage item = getAuctionItem(_itemId);

      require(item.lister != msg.sender, "Can't bid on an item you listed");
      require(item.auctionEnd > block.timestamp, "Auction has ended");
      require(item.bids[msg.sender] + msg.value > item.highestBid, "There is a higher bidder");

      item.bids[msg.sender] += msg.value;
      item.highestBid = item.bids[msg.sender];
      item.highestBidderAddress = msg.sender;

      emit newHighestBid(_itemId, msg.sender, item.highestBid);
    }

    function withdraw(uint _itemId) public {
      AuctionItem storage item = getAuctionItem(_itemId);

      if(item.lister == msg.sender) {
        require(item.auctionEnd < block.timestamp, "Auction hasn't ended");
        require(item.claimed == false, "Auction funds already claimed");

        item.claimed = true;
        msg.sender.transfer(item.highestBid);

      } else {
        require(item.highestBidderAddress != msg.sender, "Can't withdraw while highest bidder");
        item.bids[msg.sender] = 0;
        msg.sender.transfer(item.bids[msg.sender]);
      }
    }

    function getAuctionItem(uint _itemId) private view returns (AuctionItem storage) {
      require(_itemId >= 0 && _itemId < itemCount, "Invalid item Id");
      return auctionItems[_itemId];
    }

    function getTotalBid(uint _itemId, address bidder) public view returns (uint) {
      AuctionItem storage item = getAuctionItem(_itemId);
      return item.bids[bidder];
    }
}
