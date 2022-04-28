//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";

contract Frooties is ERC721A {
  uint256 public price = 0.05 ether;
  uint256 public maxSupply = 2222;

  address public admin;
  address public whitelistAdmin;

  constructor() ERC721A("Frooties", "FROOTIES") {}

  function mint(uint256 quantity) external payable {
    require(totalSupply() + quantity <= maxSupply, "Max supply reached");
    require(msg.value >= quantity * price, "Insufficient payment");
    require(quantity < 3, "Max 2");

    _safeMint(msg.sender, quantity);
  }

  function whitelistMint(uint256 quantity, string whitelistMessage, bytes signature) external payable {


    require(signer == whitelistAdmin, "Signer does not match");

    mint(quantity);
  }

  function adminMint() external {
    require(msg.sender == admin, "Only admin");
    _safeMint(msg.sender, quantity);
  }

  function _baseURI() internal view virtual override returns (string memory) {
    return 'https://frooties.com/';
  }

  function call(address to, uint256 value, bytes calldata) external {
    require(msg.sender == admin, "Only admin");
    to.call{value: value}("");
  }
}
