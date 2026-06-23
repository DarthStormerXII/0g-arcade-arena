// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import "../src/ArcadeAgentRegistry.sol";
import "../src/ArcadeContributorRegistry.sol";
import "../src/ArcadeGameRegistry.sol";
import "../src/ArcadeMatchRegistry.sol";
import "../src/ArcadeTournamentRegistry.sol";
import "../src/ArcadeWagerEscrow.sol";

contract InvalidSubmitter {
    function commit(ArcadeMatchRegistry registry, uint256 matchId) external {
        registry.commitResult(matchId, "bad-result", "bad-replay", "local://bad");
    }
}

contract ArcadeRegistriesTest {
    receive() external payable {}

    function testRegisterGame() public {
        ArcadeGameRegistry registry = new ArcadeGameRegistry();
        registry.registerGameVersion("grid-four", "1", "manifest", "rules", "0g://pack");
        require(registry.gameExists("grid-four"), "game missing");
    }

    function testRejectDuplicateVersionHash() public {
        ArcadeGameRegistry registry = new ArcadeGameRegistry();
        registry.registerGameVersion("grid-four", "1", "manifest", "rules", "0g://pack");
        bool reverted = false;
        try registry.registerGameVersion("grid-four", "1", "manifest", "rules", "0g://pack") {}
        catch { reverted = true; }
        require(reverted, "duplicate version accepted");
    }

    function testCreateFreeMatch() public {
        ArcadeMatchRegistry registry = new ArcadeMatchRegistry();
        uint256 matchId = registry.createMatch("grid-four", false);
        (bytes32 gameId, address creator, bool wagered, , , , ) = registry.matches(matchId);
        require(gameId == "grid-four", "game mismatch");
        require(creator == address(this), "creator mismatch");
        require(!wagered, "free match marked wagered");
    }

    function testCreateWagerMatch() public {
        ArcadeMatchRegistry registry = new ArcadeMatchRegistry();
        uint256 matchId = registry.createMatch("grid-four", true);
        (, , bool wagered, , , , ) = registry.matches(matchId);
        require(wagered, "wager match not marked");
    }

    function testRecordReplayHash() public {
        ArcadeMatchRegistry registry = new ArcadeMatchRegistry();
        uint256 matchId = registry.createMatch("grid-four", false);
        registry.commitResult(matchId, "result", "replay", "0g://replay");
        (, , , bytes32 resultHash, bytes32 replayHash, string memory storageUri, ) = registry.matches(matchId);
        require(resultHash == "result", "result not recorded");
        require(replayHash == "replay", "replay not recorded");
        require(keccak256(bytes(storageUri)) == keccak256("0g://replay"), "storage uri missing");
    }

    function testRejectInvalidResultSubmitter() public {
        ArcadeMatchRegistry registry = new ArcadeMatchRegistry();
        uint256 matchId = registry.createMatch("grid-four", false);
        InvalidSubmitter attacker = new InvalidSubmitter();
        bool reverted = false;
        try attacker.commit(registry, matchId) {}
        catch { reverted = true; }
        require(reverted, "invalid submitter accepted");
    }

    function testSettleWinner() public {
        ArcadeWagerEscrow escrow = new ArcadeWagerEscrow();
        uint256 beforeBalance = address(this).balance;
        escrow.createWager{value: 1 ether}(7);
        escrow.settleWinner(7, payable(address(this)));
        require(escrow.escrowed(7) == 0, "escrow not cleared");
        require(address(this).balance > beforeBalance - 1 ether, "winner not paid");
    }

    function testRejectZeroValueWager() public {
        ArcadeWagerEscrow escrow = new ArcadeWagerEscrow();
        bool reverted = false;
        try escrow.createWager{value: 0}(7) {}
        catch { reverted = true; }
        require(reverted, "zero wager accepted");
    }

    function testRejectDoubleSettle() public {
        ArcadeWagerEscrow escrow = new ArcadeWagerEscrow();
        escrow.createWager{value: 1 ether}(7);
        escrow.settleWinner(7, payable(address(this)));
        bool reverted = false;
        try escrow.settleWinner(7, payable(address(this))) {}
        catch { reverted = true; }
        require(reverted, "double settle accepted");
    }

    function testProtocolFeeAccounting() public {
        ArcadeWagerEscrow escrow = new ArcadeWagerEscrow();
        escrow.createWager{value: 1 ether}(7);
        escrow.settleWinner(7, payable(address(this)));
        require(escrow.protocolFees() == 0.02 ether, "fee mismatch");
    }

    function testRecordTournamentResult() public {
        ArcadeTournamentRegistry tournaments = new ArcadeTournamentRegistry();
        tournaments.recordTournamentResult("tournament", "root");
        require(tournaments.resultRoots("tournament") == "root", "tournament missing");
    }

    function testUpdateAgentRating() public {
        ArcadeAgentRegistry agents = new ArcadeAgentRegistry();
        agents.registerAgent("agent", "0g://agent");
        agents.updateRating("agent", 1400);
        (, , uint256 rating) = agents.agents("agent");
        require(rating == 1400, "rating missing");
    }

    function testContributorRegistration() public {
        ArcadeContributorRegistry contributors = new ArcadeContributorRegistry();
        contributors.recordContributorCredit(address(this), "grid-four");
        require(contributors.credits(address(this)) == 1, "credit missing");
    }
}
