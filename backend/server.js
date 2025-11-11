const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Provider
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

// Hardhat account private key (account #0)
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Wallet signer connected to provider
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Load ABI
const contractJson = require("./PasswordVault.json"); // Make sure this file is in your backend folder
const vault = new ethers.Contract(
     process.env.VAULT_ADDRESS,
     contractJson.abi,
     signer
);

// =================================================
// --- YOUR EXISTING ROUTES ---
// =================================================

app.post("/store", async (req, res) => {
     const { addr, ciphertext } = req.body;
     try {
         const tx = await vault.store(ciphertext);
         await tx.wait();
         res.json({ ok: true, txHash: tx.hash });
     } catch (err) {
         console.error(err);
         res.status(500).json({ error: err.message });
     }
});

app.get("/get/:addr", async (req, res) => {
     try {
         const ciphertext = await vault.get(req.params.addr);
         res.json({ ciphertext });
     } catch (err) {
         console.error(err);
         res.status(500).json({ error: err.message });
     }
});

// =================================================
// --- NEW DASHBOARD ROUTE (RECTIFIED) ---
// =================================================

app.get("/api/dashboard-stats", async (req, res) => {
   try {
     // 1. Get total password count from the new contract function
     const totalCount = await vault.getTotalPasswordCount();

     // 2. Get recent "PasswordStored" events
     const filter = vault.filters.PasswordStored();
     
    // Get the current latest block number
    const latestBlock = await provider.getBlockNumber();
    
    // Calculate the block 1000 blocks ago (but don't go below block 0)
    const fromBlock = Math.max(0, latestBlock - 1000);
    
    // Query from that calculated block up to the latest block
    const events = await vault.queryFilter(filter, fromBlock, latestBlock);

     // Map events to a clean format
     const recentActivities = events.map(event => ({
       user: event.args.user,
       website: event.args.user, // Placeholder, as your event doesn't have 'website'
       timestamp: new Date(Number(event.args.timestamp) * 1000).toLocaleString(), // Use Number() here too
       blockNumber: event.blockNumber,
     }));

     res.json({
      // --- FIX 1 ---
       totalPasswords: Number(totalCount), // Changed from totalCount.toNumber()
       // Send the 5 most recent events, reversed
       recentActivities: recentActivities.reverse().slice(0, 5) 
     });

   } catch (error) {
     console.error("Error fetching dashboard data:", error);
      // --- FIX 2 ---
     res.status(500).json({ error: 'Failed to fetch dashboard data' }); // Removed the stray "D;"
   }
});

// --- START SERVER ---
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));