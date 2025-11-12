// backend/server.js (Fixed WebSocket Version)
const express = require("express");
const cors = require("cors");
const { ethers } = require("ethers");
const fs = require("fs").promises; // For writing to the JSON file
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Database File Setup ---
const DATA_FILE = path.join(__dirname, "analytics.json");

// --- Ethers Setup (THE FIX IS HERE) ---
// We now use WebSocketProvider for a stable event connection
const provider = new ethers.WebSocketProvider("ws://127.0.0.1:8545");

// Hardhat account private key (account #0)
const PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80";

// Wallet signer connected to provider
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

// Load ABI
const contractJson = require("./PasswordVault.json");
const vault = new ethers.Contract(
  process.env.VAULT_ADDRESS,
  contractJson.abi,
  signer
);

// Helper function to read the JSON file
async function readData() {
  try {
    // Check if file exists
    await fs.access(DATA_FILE);
    // Read and parse the file
    const data = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is empty, return an empty array
    return [];
  }
}

// Helper function to write to the JSON file
async function writeData(data) {
  try {
    await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing to JSON file:", error);
  }
}

// =================================================
// --- DASHBOARD API (READS FROM JSON FILE) ---
// =================================================
app.get("/api/dashboard-stats", async (req, res) => {
  try {
    const allActivities = await readData();
    const totalPasswords = allActivities.length;

    // Get the last 5, reversed (most recent first)
    const recentActivities = allActivities.slice(-5).reverse().map(act => ({
      ...act,
      timestamp: new Date(act.timestamp).toLocaleString()
    }));
    
    res.json({
      totalPasswords: totalPasswords,
      recentActivities: recentActivities,
    });
  } catch (error) {
    console.error("Error in /api/dashboard-stats:", error);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

// =================================================
// --- BLOCKCHAIN EVENT LISTENER (WRITES TO JSON) ---
// =================================================
async function listenForEvents() {
  console.log("Listening for CredentialStored events...");

  // Use the event name from your contract: "CredentialStored"
  vault.on("CredentialStored", async (user, service, timestamp, userCount, event) => {
    
    console.log(`[EVENT] CredentialStored: User=${user}, Service=${service}`);

    // Create the new event object
    const newActivity = {
      user_address: user,
      service: service,
      user_total_credentials: Number(userCount),
      timestamp: new Date(Number(timestamp) * 1000).toISOString(),
    };

    // --- This is the inefficient part ---
    // 1. Read all existing data
    const allActivities = await readData();
    // 2. Add the new one
    allActivities.push(newActivity);
    // 3. Write all data back to the file
    await writeData(allActivities);
    
    console.log(`Successfully appended event data to analytics.json`);
  });

  // Keep the script alive. WebSocket providers can sometimes close.
  // This will log if the connection drops unexpectedly.
  provider.websocket.on("close", (code) => {
    console.error(`WebSocket connection closed (Code: ${code}). Restarting listener...`);
    // You might need a more robust restart logic here for production,
    // but for local testing, this shows the connection dropped.
    // Re-running the listener:
    listenForEvents();
  });
}

// --- START SERVER AND LISTENER ---
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  // Start the event listener
  listenForEvents();
});