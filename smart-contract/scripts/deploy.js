const hre = require("hardhat");

async function main() {
  // We are deploying "PasswordVault", not "Lock"
  const vault = await hre.ethers.deployContract("PasswordVault");

  await vault.waitForDeployment();

  console.log(
    `PasswordVault deployed to: ${vault.target}`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});