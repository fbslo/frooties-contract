const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Frooties", function () {
  let frooties;

  async function init(){
    const Frooties = await ethers.getContractFactory("Frooties");
    frooties = await Frooties.deploy();
    await frooties.deployed();
  }

  it("should fail to mint tokens: paused", async function () {
    await init()

    try {
      await frooties.mint(2, { value: ethers.utils.parseEther("0.1") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Public mint not active'");
    }
  });

  it("should fail to mint tokens: insufficient payment", async function () {
    await init()

    try {
      await frooties.mint(2, { value: ethers.utils.parseEther("0.05") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Insufficient payment'");
    }
  });

  it("should fail to mint tokens: max 2", async function () {
    await init()

    try {
      await network.provider.send("evm_setNextBlockTimestamp", [1651849200])
      await network.provider.send("evm_mine")

      await frooties.mint(1, { value: ethers.utils.parseEther("0.05") });
      await frooties.mint(1, { value: ethers.utils.parseEther("0.05") });
      await frooties.mint(1, { value: ethers.utils.parseEther("0.05") });
    } catch (e){
      expect(await e.message).to.equal("VM Exception while processing transaction: reverted with reason string 'Max 2'");
      let amount = await frooties.amounts(await frooties.admin())
      expect(amount).to.equal("2");
    }
  });

  it("should withdraw payment", async function () {
    await init()
    let vb = "0x220866B1A2219f40e72f5c628B65D54268cA3A9D";

    await (await frooties.setMintStage(2)).wait()
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
});
