//SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "erc721a/contracts/ERC721A.sol";

contract Frooties is ERC721A {
  /// @notice Price to pay per NFT
  uint256 public price = 0.05 ether;
  /// @notice Maxuimum supply
  uint256 public maxSupply = 2222;
  /// @notice Address that can call adminMint() and call()
  address public admin;
  /// @notice Address used to sign whitelist permits
  address public whitelistAdmin;
  /// @notice Mapping of amounts minter per address
  mapping(address => uint256) public amounts;
  /// @notice Enum of mint stages
  enum MintStage { PAUSED, WHITELIST, PUBLIC, ADMIN }
  /// @notice Current mint stage
  MintStage public currentMintStage = MintStage.PAUSED;


  constructor() ERC721A("Frooties", "FROOTIES") {}

  /**
   * @notice Perform basic checks (max supply, limit per address, payment)
   * @param quantity Number of NFTs to mint
   */
  modifier mintChecks(uint256 quantity){
    require(totalSupply() + quantity <= maxSupply, "Max supply reached");
    require(msg.value >= quantity * price, "Insufficient payment");
    amounts[msg.sender] += quantity;
    require(amounts[msg.sender] < 3, "Max 2");
    _;
  }

  /**
   * @notice Mint tokens
   * @param quantity Number of NFTs to mint
   */
  function mint(uint256 quantity) external payable mintChecks(quantity) {
    require(currentMintStage == MintStage.PUBLIC, "Public mint not active");
    _safeMint(msg.sender, quantity);
  }

  /**
   * @notice Mint tokens using permit signature
   * @param quantity Number of NFTs to mint
   */
  function whitelistMint(uint256 quantity, bytes memory signature) external payable mintChecks(quantity) {
    require(currentMintStage == MintStage.WHITELIST, "Whitelist mint not active");

    bytes32 messageHash = keccak256(abi.encodePacked(quantity, msg.sender, address(this)));
    bytes32 prefixHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash));
    address signer = recoverSigner(prefixHash, signatures);
    require(signer == whitelistAdmin, "Signer does not match");

    _safeMint(msg.sender, quantity);
  }

  /**
   * @notice Mint tokens for free
   * @param quantity Number of NFTs to mint
   */
  function adminMint(uint256 quantity) external {
    require(currentMintStage == MintStage.ADMIN, "Admin mint not active");
    require(totalSupply() + quantity <= maxSupply, "Max supply reached");
    require(msg.sender == admin, "Only admin");

    _safeMint(msg.sender, quantity);
  }

  function setMintStage(MintStage _mintStage) external {
    require(msg.sender == admin, "Only admin");
    currentMintStage = _mintStage;
  }

  /**
   * @notice Call any address (usefull for withdrawing ETH or retrieving tokens)
   * @dev Will not revert on failure
   * @param to Addresss to call
   * @param value ETH amount
   * @param signature Function signature
   * @param data Calldata to include
   */
  function call(address to, uint256 value, string memory signature, bytes memory data) external {
    require(msg.sender == admin, "Only admin");
    bytes memory callData;
    if (bytes(signature).length == 0) {
        callData = data;
    } else {
        callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
    }
    to.call{value: value}(callData);
  }

  /**
   * @notice Override default _baseURI function
   * @return baseURI as a string
   */
  function _baseURI() internal view virtual override returns (string memory) {
    return 'https://frooties.com/';
  }

  /**
   * @notice Recover signer address from signature
   * @param hash Hash of the message signed
   * @param signature The signature from validators
   * @return The address of the signer, address(0) if signature is invalid
   */
   function recoverSigner(bytes32 hash, bytes memory signature) internal pure returns (address) {
     bytes32 r;
     bytes32 s;
     uint8 v;

     if (signature.length != 65) {
         return (address(0));
     }

     assembly {
         r := mload(add(signature, 0x20))
         s := mload(add(signature, 0x40))
         v := byte(0, mload(add(signature, 0x60)))
     }

     if (v < 27) {
         v += 27;
     }

     if (v != 27 && v != 28) {
         return (address(0));
     } else {
         return ecrecover(hash, v, r, s);
     }
   }
}
