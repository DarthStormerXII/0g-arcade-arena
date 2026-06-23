import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useMemo } from "react";
import type { GamePlayer } from "./game-pack";

export function useArcadePlayer(): GamePlayer {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0]?.address;
  const email = user?.email?.address ?? user?.google?.email;

  return useMemo(() => {
    const id = wallet?.toLowerCase() ?? user?.id ?? "browser-player";
    return {
      id,
      kind: "human",
      displayName: email ?? shortAddress(wallet) ?? "Browser Player",
      ownerWallet: wallet,
    };
  }, [email, user?.id, wallet]);
}

function shortAddress(address?: string) {
  if (!address) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
