// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract ArcadeTournamentRegistry {
    mapping(bytes32 => bytes32) public resultRoots;
    event TournamentResultRecorded(bytes32 indexed tournamentId, bytes32 resultRoot);

    function recordTournamentResult(bytes32 tournamentId, bytes32 resultRoot) external {
        require(tournamentId != bytes32(0), "tournament required");
        resultRoots[tournamentId] = resultRoot;
        emit TournamentResultRecorded(tournamentId, resultRoot);
    }
}
