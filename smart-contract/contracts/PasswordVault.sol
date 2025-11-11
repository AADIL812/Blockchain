// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol"; // This is fine to keep for debugging

contract PasswordVault {
    
    // 1. ADD THIS COUNTER
    uint256 private _totalPasswords;

    mapping(address => string) public passwords;

    // 2. UPDATE YOUR EVENT to include a timestamp
    event PasswordStored(address indexed user, uint256 timestamp);

    function store(string calldata encryptedPassword) external {
        passwords[msg.sender] = encryptedPassword;
        
        // 3. UPDATE the 'store' function
        _totalPasswords++; // Increment the counter
        emit PasswordStored(msg.sender, block.timestamp); // Emit the new event
    }

    function get(address user) external view returns (string memory) {
        return passwords[user];
    }

    // 4. ADD THIS NEW FUNCTION for the dashboard
    function getTotalPasswordCount() public view returns (uint256) {
        return _totalPasswords;
    }
}