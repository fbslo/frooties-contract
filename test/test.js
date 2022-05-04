const { expect } = require("chai");
const { ethers } = require("hardhat");

const abi = require('ethereumjs-abi')
const sigUtil = require("eth-sig-util")

describe("Frooties", function () {
  let frooties;
  let whitelistAdmin = "0x89af617d3fd6D8C2fc46E19DBC37305465154dE7"
  let whitelistAdminPrivateKey = "0xe7103cbdaf2db00c8b3a20cbcf6ebcf872fd8a95e243c876b50f5bc0edb6026e"

  let whitelistTimestamp = 1651845600; //Fri May 06 2022 16:00:00 GMT+0200
  let publicTimestamp = 1651849200; //Fri May 06 2022 17:00:00 GMT+0200
  let reserveTimestamp = 1651860000; //Fri May 06 2022 20:00:00 GMT+0200

  async function init(){
    const Frooties = await ethers.getContractFactory("Frooties");
    frooties = await Frooties.deploy(whitelistAdmin);
    await frooties.deployed();
  }

  /// --- WHITELIST --- \\\

  it("should fail to mint tokens: whitelist not active", async function () {
    await init()

    try {
      await network.provider.send("evm_setNextBlockTimestamp", [whitelistTimestamp - 1000])
      await network.provider.send("evm_mine")

      const [signer] = await ethers.getSigners();
      let msgHash = await web3.utils.soliditySha3(signer.address, frooties.address);
      let msgParams = { data: msgHash }
      let signature = await sigUtil.personalSign(ethers.utils.arrayify(whitelistAdminPrivateKey), msgParams)

      await frooties.whitelistMint(1, signature, { value: ethers.utils.parseEther("0.05") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Whitelist mint not active'");
      let amount = await frooties.amounts(await frooties.admin())
      expect(amount).to.equal("0");
    }
  });

  it("should fail to mint tokens: max 2 for whitelist", async function () {
    await init()

    try {
      await network.provider.send("evm_setNextBlockTimestamp", [whitelistTimestamp+1])
      await network.provider.send("evm_mine")

      const [signer] = await ethers.getSigners();
      let msgHash = await web3.utils.soliditySha3(signer.address, frooties.address);
      let msgParams = { data: msgHash }
      let signature = await sigUtil.personalSign(ethers.utils.arrayify(whitelistAdminPrivateKey), msgParams)

      await frooties.whitelistMint(3, signature, { value: ethers.utils.parseEther("0.15") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Max 2'");
      let amount = await frooties.amounts(await frooties.admin())
      expect(amount).to.equal("0");
    }
  });

  it("should fail to mint tokens: invalid contract in signature data", async function () {
    await init()

    try {
      const [signer] = await ethers.getSigners();
      let msgHash = await web3.utils.soliditySha3(signer.address, "0x00192fb10df37c9fb26829eb2cc623cd1bf599e8");
      let msgParams = { data: msgHash }
      let signature = await sigUtil.personalSign(ethers.utils.arrayify(whitelistAdminPrivateKey), msgParams)

      await frooties.whitelistMint(1, signature, { value: ethers.utils.parseEther("0.05") });
    } catch (e) {
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Signer does not match'");
      let amount = await frooties.amounts(await frooties.admin())
      expect(amount).to.equal("0");
    }
  });

  it("should fail to mint tokens: invalid sender in signature data", async function () {
    await init()

    try {
      const [signer] = await ethers.getSigners();
      let msgHash = await web3.utils.soliditySha3("0x00192fb10df37c9fb26829eb2cc623cd1bf599e8", frooties.address);
      let msgParams = { data: msgHash }
      let signature = await sigUtil.personalSign(ethers.utils.arrayify(whitelistAdminPrivateKey), msgParams)

      await frooties.whitelistMint(1, signature, { value: ethers.utils.parseEther("0.05") });
    } catch (e) {
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Signer does not match'");
      let amount = await frooties.amounts(await frooties.admin())
      expect(amount).to.equal("0");
    }
  });

  it("should mint tokens: whitelist", async function () {
    await init()

    const [signer] = await ethers.getSigners();
    let msgHash = await web3.utils.soliditySha3(signer.address, frooties.address);
    let msgParams = { data: msgHash }
    let signature = await sigUtil.personalSign(ethers.utils.arrayify(whitelistAdminPrivateKey), msgParams)

    await frooties.whitelistMint(1, signature, { value: ethers.utils.parseEther("0.05") });
    await frooties.whitelistMint(1, signature, { value: ethers.utils.parseEther("0.05") });
    let amount = await frooties.amounts(await frooties.admin())
    expect(amount).to.equal("2");
    let totalSupply = await frooties.totalSupply()
    expect(amount).to.equal("2");
  });

  it("should fail to mint tokens: max 2 for whitelist x 2", async function () {
    await init()

    try {
      const [signer] = await ethers.getSigners();
      let msgHash = await web3.utils.soliditySha3(signer.address, frooties.address);
      let msgParams = { data: msgHash }
      let signature = await sigUtil.personalSign(ethers.utils.arrayify(whitelistAdminPrivateKey), msgParams)

      await frooties.whitelistMint(3, signature, { value: ethers.utils.parseEther("0.15") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Max 2'");
      let amount = await frooties.amounts(await frooties.admin())
      expect(amount).to.equal("0");
    }
  });

  /// --- PUBLIC --- \\\

  it("should fail to mint tokens: public mint not active", async function () {
    await init()

    try {
      await frooties.mint(2, { value: ethers.utils.parseEther("0.1") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Public mint not active'");
    }
  });

  it("should fail to mint tokens: max 3 for public", async function () {
    await init()

    try {
      await network.provider.send("evm_setNextBlockTimestamp", [publicTimestamp+1])
      await network.provider.send("evm_mine")

      await frooties.mint(4, { value: ethers.utils.parseEther("0.20") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Max 3'");
      let amount = await frooties.amounts(await frooties.admin())
      expect(amount).to.equal("0");
    }
  });

  it("should mint tokens: public", async function () {
    await init()

    await frooties.mint(1, { value: ethers.utils.parseEther("0.05") });
    await frooties.mint(1, { value: ethers.utils.parseEther("0.05") });
    let amount = await frooties.amounts(await frooties.admin())
    expect(amount).to.equal("2");
  });

  it("should fail to mint tokens: insufficient payment", async function () {
    await init()

    try {
      await frooties.mint(2, { value: ethers.utils.parseEther("0.05") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Insufficient payment'");
    }
  });

  /// --- RESERVE --- \\\

  it("should fail to mint tokens: reserve mint not active", async function () {
    await init()

    try {
      await frooties.reserveMint(1);
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Reserve mint not active'");
    }
  });

  it("should fail to mint tokens: max 50 for reserve", async function () {
    await init()

    try {
      await network.provider.send("evm_setNextBlockTimestamp", [reserveTimestamp+1])
      await network.provider.send("evm_mine")

      await frooties.reserveMint(51);
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Max 50'");
      let amount = await frooties.amounts("0x0000000000000000000000000000000000000000")
      expect(amount).to.equal("0");
    }
  });

  it("should fail to mint tokens: max 50 for reserve x 2", async function () {
    await init()

    try {
      await frooties.reserveMint(49);
      await frooties.reserveMint(2);
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Max 50'");
      let amount = await frooties.amounts("0x0000000000000000000000000000000000000000")
      expect(amount).to.equal("49");
    }
  });

  it("should withdraw payment", async function () {
    await init()
    let vb = "0x220866B1A2219f40e72f5c628B65D54268cA3A9D";

    await network.provider.send("evm_setNextBlockTimestamp", [reserveTimestamp+1000])
    await network.provider.send("evm_mine")
    await frooties.mint(1, { value: ethers.utils.parseEther("0.05") });

    let contractBalance = await frooties.provider.getBalance(frooties.address)
    expect(contractBalance.toString()).to.equal(ethers.utils.parseEther("0.05"));

    let vbBalance = await frooties.provider.getBalance(vb)

    await (await frooties.call(vb, contractBalance, "", "0x")).wait()

    let contractBalance2 = await frooties.provider.getBalance(frooties.address)
    expect(contractBalance2.toString()).to.equal(ethers.utils.parseEther("0"));
    let vbBalance2 = await frooties.provider.getBalance(vb)
    expect(vbBalance2.sub(vbBalance)).to.equal(ethers.utils.parseEther("0.05"));
  });

  /// --- CONTRACT --- \\\

  it("should get token URI", async function () {
    await frooties.mint(2, { value: ethers.utils.parseEther("0.1") });
    let tokenURI = await frooties.tokenURI(1)
    expect(tokenURI).to.equal("https://metadata.thefrooties.com/1");
  });

});
