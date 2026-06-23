// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract ArcadeMatchRegistry {
    struct MatchRecord {
        bytes32 gameId;
        address creator;
        bool wagered;
        bytes32 resultHash;
        bytes32 replayHash;
        string storageUri;
        bool settled;
    }

    uint256 public nextMatchId = 1;
    mapping(uint256 => MatchRecord) public matches;

    event MatchCreated(uint256 indexed matchId, bytes32 indexed gameId, bool wagered);
    event ResultCommitted(uint256 indexed matchId, bytes32 resultHash, bytes32 replayHash);

    function createMatch(bytes32 gameId, bool wagered) external returns (uint256 matchId) {
        require(gameId != bytes32(0), "game required");
        matchId = nextMatchId++;
        matches[matchId] = MatchRecord(gameId, msg.sender, wagered, bytes32(0), bytes32(0), "", false);
        emit MatchCreated(matchId, gameId, wagered);
    }

    function commitResult(uint256 matchId, bytes32 resultHash, bytes32 replayHash, string calldata storageUri) external {
        MatchRecord storage record = matches[matchId];
        require(record.creator == msg.sender, "invalid result submitter");
        require(record.resultHash == bytes32(0), "result already committed");
        record.resultHash = resultHash;
        record.replayHash = replayHash;
        record.storageUri = storageUri;
        emit ResultCommitted(matchId, resultHash, replayHash);
    }
}
