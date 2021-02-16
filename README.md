# AuctionApp

An Ethereum smart contract to emulate a standard English auction.
Smart contract functions:
- addListing(itemName: string, auctionDuration: number(seconds));
- placeBid(itemId: number) Payable
- withdraw(itemId: number)
- getTotalBid(itemId: number, bidderAddress: address)
