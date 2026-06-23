// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract ArcadeContributorRegistry {
    mapping(address => uint256) public credits;
    event ContributorCreditRecorded(address indexed contributor, bytes32 indexed gameId, uint256 totalCredits);

    function recordContributorCredit(address contributor, bytes32 gameId) external {
        require(contributor != address(0), "contributor required");
        credits[contributor] += 1;
        emit ContributorCreditRecorded(contributor, gameId, credits[contributor]);
    }
}
