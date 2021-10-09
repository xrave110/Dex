const Link = artifacts.require("Link");
const Dex = artifacts.require("Dex");

module.exports = async function (deployer, network, accounts) { // add synchronous to the function -> async and await
  // additional args:
  // network - specifies what kind of network is now, mainnet, testnet, etc
  // accounts - ganache accounts -> it must be added if you want to have accounts addresses available
  await deployer.deploy(Link);
};
