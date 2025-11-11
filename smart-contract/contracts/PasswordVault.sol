// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "hardhat/console.sol";

contract PasswordVault {
    
    // --- DATA STRUCTURE ---
    struct Credential {
        string service;
        string username;
        string encryptedPassword;
        string[] shares;
    }

    mapping(address => Credential[]) public userCredentials;

    // --- DASHBOARD FEATURES ---
    uint256 private _totalCredentialsStored;
    mapping(address => uint256) private _userCredentialCount;

    // --- MODIFIED EVENT ---
    // We've added userCount as a new parameter to the event
    event CredentialStored(
        address indexed user, 
        string service, 
        uint256 timestamp, 
        uint256 userCount // <-- NEW
    );

    // --- CORE FUNCTIONS ---
    function storeCredential(
        string calldata _service,
        string calldata _username,
        string calldata _encryptedPassword,
        string[] calldata _shares
    ) external {
        userCredentials[msg.sender].push(
            Credential({
                service: _service,
                username: _username,
                encryptedPassword: _encryptedPassword,
                shares: _shares
            })
        );

        // --- INCREMENT COUNTERS ---
        _totalCredentialsStored++;
        _userCredentialCount[msg.sender]++;
        
        // --- MODIFIED EMIT ---
        // We now emit the new user-specific count
        emit CredentialStored(
            msg.sender, 
            _service, 
            block.timestamp, 
            _userCredentialCount[msg.sender] // <-- NEW
        );
    }

    function getCredentials() external view returns (Credential[] memory) {
        return userCredentials[msg.sender];
    }

    // --- DASHBOARD GETTER FUNCTIONS ---
    function getTotalCredentialCount() public view returns (uint256) {
        return _totalCredentialsStored;
    }

    function getMyCredentialCount() public view returns (uint256) {
        return _userCredentialCount[msg.sender];
    }
}