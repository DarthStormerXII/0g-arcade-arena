// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract ArcadeGameRegistry {
    struct GameVersion {
        bytes32 manifestHash;
        bytes32 rulesHash;
        string storageUri;
        address contributor;
    }

    mapping(bytes32 => mapping(bytes32 => GameVersion)) public versions;
    mapping(bytes32 => bool) public gameExists;

    event GameVersionRegistered(bytes32 indexed gameId, bytes32 indexed versionHash, address indexed contributor);

    function registerGameVersion(
        bytes32 gameId,
        bytes32 versionHash,
        bytes32 manifestHash,
        bytes32 rulesHash,
        string calldata storageUri
    ) external {
        require(gameId != bytes32(0), "game id required");
        require(versionHash != bytes32(0), "version required");
        require(versions[gameId][versionHash].contributor == address(0), "duplicate version");
        versions[gameId][versionHash] = GameVersion(manifestHash, rulesHash, storageUri, msg.sender);
        gameExists[gameId] = true;
        emit GameVersionRegistered(gameId, versionHash, msg.sender);
    }
}
