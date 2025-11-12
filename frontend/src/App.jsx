import { useState } from 'react';
import { ethers } from 'ethers';
import CryptoJS from 'crypto-js';
import { Buffer } from 'buffer';
window.Buffer = Buffer; // Make Buffer globally available
import * as shamirs from 'shamirs-secret-sharing';
import './App.css';

// --- !!! IMPORTANT !!! ---
// This is your correct contract address
const VAULT_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

// This is your CORRECTED ABI. I have fixed the syntax errors and removed the duplicates.
const VAULT_ABI = [
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "user",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "service",
        "type": "string"
      },
      // --- ADDING THE MISSING FIELDS FROM YOUR CONTRACT ---
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "userCount",
        "type": "uint256"
      }
    ],
    "name": "CredentialStored",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "getCredentials",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "service",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "username",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "encryptedPassword",
            "type": "string"
          },
          {
            "internalType": "string[]",
            "name": "shares",
            "type": "string[]"
          }
        ],
        "internalType": "struct PasswordVault.Credential[]",
        "name": "",
        "type": "tuple[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // --- ADDING THE MISSING GETTER FUNCTIONS ---
  {
    "inputs": [],
    "name": "getTotalCredentialCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getMyCredentialCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  // --- END OF ADDED FUNCTIONS ---
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "_service",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_username",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "_encryptedPassword",
        "type": "string"
      },
      {
        "internalType": "string[]",
        "name": "_shares",
        "type": "string[]"
      }
    ],
    "name": "storeCredential",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userCredentials",
    "outputs": [
      {
        "internalType": "string",
        "name": "service",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "username",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "encryptedPassword",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
// --- END OF ABI/ADDRESS ---


function App() {
  const [account, setAccount] = useState(null);
  const [contract, setContract] = useState(null);

  const [service, setService] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [masterPassword, setMasterPassword] = useState(''); // This is our "secret"

  const [allCredentials, setAllCredentials] = useState([]);
  const [message, setMessage] = useState('Please connect your wallet.');
  const [sharesMessage, setSharesMessage] = useState('');
  
  // For recovery
  const [share1, setShare1] = useState('');
  const [share2, setShare2] = useState('');
  const [recoveredKey, setRecoveredKey] = useState('');

  // 1. Connect Wallet Logic
  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      setMessage("Please install MetaMask!");
      return;
    }
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const userAccount = accounts[0];
      setAccount(userAccount);

      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      const ethersSigner = await ethersProvider.getSigner();
      
      const vaultContract = new ethers.Contract(VAULT_CONTRACT_ADDRESS, VAULT_ABI, ethersSigner);
      setContract(vaultContract);
      setMessage("Wallet connected to local blockchain!");
      
    } catch (error) {
      console.error("Connection Error:", error);
      setMessage("Failed to connect wallet. Is your local blockchain running? Is the ABI correct?");
    }
  };

  // 2. Store Credential Logic with Shamir's (FIXED - This now splits the password bytes)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!contract) {
      setMessage("Please connect your wallet first.");
      return;
    }
    if (!masterPassword) {
      setMessage("Please enter a master password to use as the secret.");
      return;
    }

    try {
      // 1. Encrypt the password using the master password
      const encryptedPassword = CryptoJS.AES.encrypt(password, masterPassword).toString();
      
      // 2. Create Shamir's shares from the master password (the "secret")
      // We convert the password string ("1234") to raw bytes (Buffer)
      const secretBytes = Buffer.from(masterPassword, 'utf8');
      
      // We split the raw bytes
      const shares = shamirs.split(secretBytes, { shares: 3, threshold: 2 });
      
      // Convert shares (which are Buffers) to storable hex strings
      const stringShares = shares.map(share => share.toString('hex'));

      setMessage("Storing credential and key shares... Please approve in your wallet.");
      
      // --- THIS IS THE FIX ---
      // We added a high gasLimit to prevent the transaction from failing
      const tx = await contract.storeCredential(
        service, 
        username, 
        encryptedPassword, 
        stringShares,
        { gasLimit: 1_000_000 } // <-- FIX: Set manual gas limit
      );
      // --- END OF FIX ---
      
      await tx.wait(); // Wait for the transaction to be mined

      setMessage("Credential stored successfully!");
      setSharesMessage(`Your recovery shares are: \n1: ${stringShares[0]}\n2: ${stringShares[1]}\n3: ${stringShares[2]}\nSave 2 of these to recover your key.`);

      // Clear inputs
      setService('');
      setUsername('');
      setPassword('');
      
    } catch (error) {
      console.error(error);
      setMessage(`Failed to store credential: ${error.message}`);
    }
  };

  // 3. Get Credentials Logic (Encrypted) - SYNTAX FIX
  const handleGetCredentials = async () => {
    if (!contract) {
      setMessage("Please connect your wallet first.");
      return;
    }

    try {
      setMessage("Fetching credentials from local blockchain...");
      const storedCreds = await contract.getCredentials();
      
      // Check if storedCreds is empty or undefined
      if (!storedCreds || storedCreds.length === 0) {
        setMessage("No credentials found for this account.");
        setAllCredentials([]);
        return;
      }

      const formattedCreds = storedCreds.map(cred => ({
        service: cred.service,
        username: cred.username,
        encryptedPass: cred.encryptedPassword,
        shares: cred.shares.join(', '), // This will now work
      }));

      setAllCredentials(formattedCreds);
      setMessage(`Found ${formattedCreds.length} credentials.`);
    } catch (error) {
      console.error(error);
      setMessage(`Failed to fetch credentials: ${error.message}`);
    }
  };

  // 4. Recover Master Password with Shamir's (FIXED - This now recovers the password text)
  const handleRecoverKey = () => {
    if (!share1 || !share2) {
      setSharesMessage("Please enter two different shares to recover.");
      return;
    }
    try {
      // 1. Convert the hex strings from the input fields back into Buffers
      const sharesToCombine = [
        Buffer.from(share1, 'hex'),
        Buffer.from(share2, 'hex')
      ];
      
      // 2. Combine the shares to get the original secret (as a Buffer)
      const recoveredSecretBuffer = shamirs.combine(sharesToCombine);
      
      // 3. Convert the Buffer back to the original text string ("1234")
      const recoveredPassword = recoveredSecretBuffer.toString('utf8');
      
      setRecoveredKey(recoveredPassword);
      setSharesMessage("Master Password Recovered! You can now use this to decrypt your passwords.");
    
    } catch (err) {
      console.error(err);
      setSharesMessage("Recovery failed. Are the shares correct?");
      setRecoveredKey(''); // Clear the key on failure
    }
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>Blockchain Password Manager (Local + Shamir's)</h1>
        {account ? (
          <p>Connected: {account.substring(0, 6)}...{account.substring(account.length - 4)}</p>
        ) : (
          <button onClick={connectWallet}>Connect Wallet</button>
        )}
        {message && <p className="message">{message}</p>}
      </header>

      <main>
        <div className="card">
          <h2>1. Store New Credential</h2>
          <form onSubmit={handleSubmit}>
            <input type="text" placeholder="Service (e.g., google.com)" value={service} onChange={(e) => setService(e.target.value)} required />
            <input type="text" placeholder="Username / Email" value={username} onChange={(e) => setUsername(e.target.value)} required />
            <input type="password" placeholder="Password to save" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <input type="password" placeholder="Your Master Password (this will be split)" value={masterPassword} onChange={(e) => setMasterPassword(e.target.value)} required />
            <button type="submit" disabled={!account}>Store Credential</button>
          </form>
          {sharesMessage && <pre className="message">{sharesMessage}</pre>}
        </div>
        
        <div className="card">
          <h2>2. Recover Master Password (Shamir's)</h2>
          <p>Enter 2 of your 3 shares to get your Master Password.</p>
          <input type="text" placeholder="Paste Share 1" value={share1} onChange={(e) => setShare1(e.target.value)} />
          <input type="text" placeholder="Paste Share 2" value={share2} onChange={(e) => setShare2(e.target.value)} />
          <button onClick={handleRecoverKey}>Recover Key</button>
          {recoveredKey && <p className="message">Recovered Key: <strong>{recoveredKey}</strong></p>}
        </div>

        <div className="card">
          <h2>3. View & Decrypt Credentials</h2>
          <button onClick={handleGetCredentials} disabled={!account}>
            Fetch Encrypted Credentials
          </button>
          <div className="credentials-list">
            {allCredentials.length > 0 ? (
              <table>
                <thead>
                  <tr>
                    <th>Service</th>
                    <th>Username</th>
                    <th>Encrypted Password</th>
                    <th>Shares (on chain)</th>
                  </tr>
                </thead>
                <tbody>
                  {allCredentials.map((cred, index) => (
                    <tr key={index}>
                      <td>{cred.service}</td>
                      <td>{cred.username}</td>
                      <td style={{wordBreak: 'break-all'}}>{cred.encryptedPass}</td>
                      <td style={{wordBreak: 'break-all'}}>{cred.shares}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p>No credentials loaded.</p>
            )}
           
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;