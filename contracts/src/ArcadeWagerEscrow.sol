// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract ArcadeWagerEscrow {
    uint256 public protocolFees;
    mapping(uint256 => uint256) public escrowed;

    event WagerCreated(uint256 indexed matchId, uint256 amount);
    event WagerSettled(uint256 indexed matchId, address indexed winner, uint256 payout, uint256 fee);

    function createWager(uint256 matchId) external payable {
        require(msg.value > 0, "wager required");
        escrowed[matchId] += msg.value;
        emit WagerCreated(matchId, msg.value);
    }

    function settleWinner(uint256 matchId, address payable winner) external {
        uint256 amount = escrowed[matchId];
        require(amount > 0, "nothing escrowed");
        escrowed[matchId] = 0;
        uint256 fee = amount / 50;
        uint256 payout = amount - fee;
        protocolFees += fee;
        winner.transfer(payout);
        emit WagerSettled(matchId, winner, payout, fee);
    }
}
