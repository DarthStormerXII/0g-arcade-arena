import { usePrivy, useWallets } from "@privy-io/react-auth";
import { LogIn, LogOut, Wallet } from "lucide-react";
import { Button } from "./ui/button";
import { StatusPill } from "./ui/panel";

function shortAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function WalletStatus() {
  const { authenticated, connectOrCreateWallet, error, login, logout, ready, user } = usePrivy();
  const { ready: walletsReady, wallets } = useWallets();
  const activeWallet = wallets[0];
  const email = user?.email?.address ?? user?.google?.email ?? "Privy test account";

  if (!import.meta.env.VITE_PRIVY_APP_ID) {
    return <StatusPill tone="yellow">Privy app id missing</StatusPill>;
  }

  if (!ready) {
    return <StatusPill tone="yellow">Auth loading</StatusPill>;
  }

  if (error) {
    return <StatusPill tone="yellow">Auth error</StatusPill>;
  }

  if (!authenticated) {
    return (
      <Button variant="secondary" onClick={() => login({ loginMethods: ["email"] })}>
        <LogIn size={16} /> Login
      </Button>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 text-xs">
      <div className="rounded-md border border-[#46ff9f55] bg-[#46ff9f12] px-3 py-2">
        <div className="uppercase text-white/45">signed in</div>
        <div className="max-w-[14rem] truncate font-bold text-[#46ff9f]">{email}</div>
      </div>
      {walletsReady && activeWallet ? (
        <div className="rounded-md border border-white/10 bg-black/35 px-3 py-2">
          <div className="uppercase text-white/45">wallet</div>
          <div
            className="font-mono font-bold text-white"
            data-testid="privy-wallet-address"
            data-wallet-address={activeWallet.address}
            title={activeWallet.address}
          >
            {shortAddress(activeWallet.address)}
          </div>
        </div>
      ) : (
        <Button variant="secondary" onClick={connectOrCreateWallet}>
          <Wallet size={16} /> Create Wallet
        </Button>
      )}
      <Button variant="ghost" onClick={() => void logout()}>
        <LogOut size={16} /> Logout
      </Button>
    </div>
  );
}
