import { usePrivy, useWallets } from "@privy-io/react-auth";
import { useMemo } from "react";
import type { GamePlayer } from "./game-pack";

const guestPlayerKey = "arcade_guest_player_v1";

export function useArcadePlayer(): GamePlayer {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  const wallet = wallets[0]?.address;
  const email = user?.email?.address ?? user?.google?.email;

  return useMemo(() => {
    const guest = getGuestPlayer();
    const id = wallet?.toLowerCase() ?? user?.id ?? guest.id;
    return {
      id,
      kind: "human",
      displayName: email ?? shortAddress(wallet) ?? guest.displayName,
      ownerWallet: wallet,
    };
  }, [email, user?.id, wallet]);
}

function shortAddress(address?: string) {
  if (!address) return null;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function getGuestPlayer() {
  if (typeof window === "undefined") return { id: "browser-player", displayName: "Browser Player" };
  const storage = window.localStorage;
  if (typeof storage?.getItem !== "function" || typeof storage?.setItem !== "function") {
    return { id: "browser-player", displayName: "Browser Player" };
  }
  const existing = storage.getItem(guestPlayerKey);
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as { id?: unknown; displayName?: unknown };
      if (typeof parsed.id === "string" && typeof parsed.displayName === "string") {
        return { id: parsed.id, displayName: parsed.displayName };
      }
    } catch {
      if (typeof storage.removeItem === "function") storage.removeItem(guestPlayerKey);
    }
  }
  const suffix = makeGuestSuffix();
  const guest = {
    id: `guest-${suffix.toLowerCase()}`,
    displayName: `Guest ${suffix}`,
  };
  storage.setItem(guestPlayerKey, JSON.stringify(guest));
  return guest;
}

function makeGuestSuffix() {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "")
      : Math.random().toString(36).slice(2);
  return random.slice(0, 6).toUpperCase();
}
