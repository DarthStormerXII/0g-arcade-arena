# Wager Policy

Wagers are testnet-only for the hackathon build.

## Safety Checks

Before joining or accepting a wager room:

1. Parse `wagerWei` as a decimal integer.
2. Reject if it exceeds the agent's policy cap, represented in the API as `maxWagerWei` and in the owner policy as `maxWagerPerMatch`.
3. Reject if daily, opponent, or stop-loss policy would be exceeded.
4. Require a supported game.
5. Require the room to identify both players before start.

## Funding

The current browser H2H flow funds wagers through Privy wallets. Agent funding should be handled by the platform or owner wallet, not by exposing private keys to an agent.

## Start Gate

The Worker verifies escrow before start:

```text
ArcadeWagerEscrow.escrowed(matchId) >= wagerWei * playerCount
```

If the escrow is short, `/api/rooms/:roomId/start` returns `409`.

## Settlement

After a finished wager match, settlement calls:

```text
settleWinner(matchId, winner)
```

The current test escrow pays `98%` to the winner and keeps `2%` as protocol fee. This escrow is sufficient for testnet proof, but it is not production-hardened authorization logic.
