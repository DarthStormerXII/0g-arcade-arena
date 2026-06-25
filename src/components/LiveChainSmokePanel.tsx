import { ExternalLink } from "lucide-react";
import { liveChainProof, shortHash } from "../lib/live-chain-proof";
import { Panel, StatusPill } from "./ui/panel";

function txUrl(txHash: string) {
  return `${liveChainProof.explorer}/tx/${txHash}`;
}

function addressUrl(address: string) {
  return `${liveChainProof.explorer}/address/${address}`;
}

export function LiveChainSmokePanel({ compact = false }: { compact?: boolean }) {
  const txs = compact ? liveChainProof.transactions.slice(0, 5) : liveChainProof.transactions;
  return (
    <Panel className="min-w-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StatusPill tone="green">Live Galileo Chain Smoke</StatusPill>
          <h2 className="mt-3 text-2xl font-black uppercase">Verified on 0G Chain</h2>
          <p className="mt-2 text-sm text-white/62">
            Six contracts and nine registry/wager transactions were mined on chain ID {liveChainProof.chainId}. This
            receipt is chain-only; Storage, Compute, and DA proof states are shown in the dedicated live proof panels.
          </p>
        </div>
        <div className="rounded-sm border border-white/10 bg-[#140820]/70 p-3 text-xs">
          <div className="uppercase text-white/45">verified at</div>
          <div className="font-mono text-white">{liveChainProof.verifiedAt}</div>
          <div className="mt-2 uppercase text-white/45">operator balance</div>
          <div className="font-mono text-[#e7c7ff]">{liveChainProof.balances.operator} 0G</div>
        </div>
      </div>
      <div className="mt-4 grid min-w-0 gap-3 lg:grid-cols-2">
        <div className="min-w-0 rounded-sm border border-white/10 bg-[#140820]/70 p-3">
          <h3 className="font-black uppercase">Contracts</h3>
          <div className="mt-3 grid gap-2">
            {liveChainProof.deployments.map((deployment) => (
              <a
                key={deployment.address}
                className="group min-w-0 rounded-sm border border-white/10 bg-[#140820]/70 p-2 hover:border-[#c084fc66]"
                href={addressUrl(deployment.address)}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{deployment.name}</span>
                  <ExternalLink size={14} />
                </div>
                <div className="mt-1 break-all font-mono text-xs text-white/65">{deployment.address}</div>
                <div className="mt-1 text-xs text-white/45">block {deployment.blockNumber}</div>
              </a>
            ))}
          </div>
        </div>
        <div className="min-w-0 rounded-sm border border-white/10 bg-[#140820]/70 p-3">
          <h3 className="font-black uppercase">Write Transactions</h3>
          <div className="mt-3 grid gap-2">
            {txs.map((tx) => (
              <a
                key={tx.txHash}
                className="group min-w-0 rounded-sm border border-white/10 bg-[#140820]/70 p-2 hover:border-[#c084fc66]"
                href={txUrl(tx.txHash)}
                rel="noreferrer"
                target="_blank"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold">{tx.name}</span>
                  <ExternalLink size={14} />
                </div>
                <div className="mt-1 font-mono text-xs text-[#e7c7ff]">{shortHash(tx.txHash)}</div>
                <div className="mt-1 text-xs text-white/45">block {tx.blockNumber}</div>
              </a>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusPill tone="green">{liveChainProof.scope.chain}</StatusPill>
        <StatusPill tone="yellow">{liveChainProof.scope.storage}</StatusPill>
        <StatusPill tone="yellow">{liveChainProof.scope.compute}</StatusPill>
        <StatusPill tone="cyan">{liveChainProof.scope.da}</StatusPill>
      </div>
    </Panel>
  );
}
