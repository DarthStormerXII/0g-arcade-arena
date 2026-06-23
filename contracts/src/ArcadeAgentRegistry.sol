// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

contract ArcadeAgentRegistry {
    struct Agent {
        address owner;
        string metadataUri;
        uint256 rating;
    }

    mapping(bytes32 => Agent) public agents;
    event AgentRegistered(bytes32 indexed agentId, address indexed owner);
    event AgentRatingUpdated(bytes32 indexed agentId, uint256 rating);

    function registerAgent(bytes32 agentId, string calldata metadataUri) external {
        require(agents[agentId].owner == address(0), "agent exists");
        agents[agentId] = Agent(msg.sender, metadataUri, 1200);
        emit AgentRegistered(agentId, msg.sender);
    }

    function updateRating(bytes32 agentId, uint256 rating) external {
        require(agents[agentId].owner != address(0), "missing agent");
        agents[agentId].rating = rating;
        emit AgentRatingUpdated(agentId, rating);
    }
}
