import { liveChainProof } from "./live-chain-proof";
import { stableHash } from "./hash";

type EthereumProvider = {
  request(input: { method: string; params?: unknown[] }): Promise<unknown>;
};

export type EthereumWallet = {
  address: string;
  switchChain?(targetChainId: `0x${string}` | number): Promise<void>;
  getEthereumProvider(): Promise<EthereumProvider>;
};

export type WagerTxReceipt = {
  transactionHash: string;
  blockNumber: string;
  status: string;
};

const galileo = {
  chainId: "0x40da",
  rpcUrls: ["https://evmrpc-testnet.0g.ai"],
};

const wagerEscrow = liveChainProof.deployments.find((deployment) => deployment.name === "Wager Escrow")?.address;

export function wagerEscrowAddress() {
  if (!wagerEscrow) throw new Error("Wager Escrow deployment missing");
  return wagerEscrow;
}

export function wagerMatchId(roomId: string) {
  return BigInt(stableHash(`wager:${roomId}`));
}

export async function createWager(wallet: EthereumWallet, roomId: string, wagerWei: string) {
  const matchId = wagerMatchId(roomId);
  const provider = await getGalileoProvider(wallet);
  return sendAndWait(provider, {
    from: wallet.address,
    to: wagerEscrowAddress(),
    value: toQuantity(wagerWei),
    data: `0x30da3d7e${uint256(matchId)}`,
    chainId: galileo.chainId,
  });
}

export async function settleWager(wallet: EthereumWallet, roomId: string, winner: string) {
  const matchId = wagerMatchId(roomId);
  const provider = await getGalileoProvider(wallet);
  return sendAndWait(provider, {
    from: wallet.address,
    to: wagerEscrowAddress(),
    value: "0x0",
    data: `0x91ee1e8a${uint256(matchId)}${addressArg(winner)}`,
    chainId: galileo.chainId,
  });
}

async function getGalileoProvider(wallet: EthereumWallet) {
  if (wallet.switchChain) {
    await wallet.switchChain(16602);
    return wallet.getEthereumProvider();
  }
  const provider = await wallet.getEthereumProvider();
  await provider.request({ method: "wallet_switchEthereumChain", params: [{ chainId: galileo.chainId }] });
  return provider;
}

async function sendAndWait(provider: EthereumProvider, tx: Record<string, string>) {
  let transactionHash: string;
  try {
    transactionHash = (await provider.request({ method: "eth_sendTransaction", params: [tx] })) as string;
  } catch (caught) {
    const hash = String(caught instanceof Error ? caught.message : caught).match(/0x[a-fA-F0-9]{64}/)?.[0];
    if (!hash) throw caught;
    transactionHash = hash;
  }
  const receipt = await waitForReceipt(transactionHash);
  return receipt;
}

async function waitForReceipt(transactionHash: string): Promise<WagerTxReceipt> {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const response = await fetch(galileo.rpcUrls[0], {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: attempt + 1,
        method: "eth_getTransactionReceipt",
        params: [transactionHash],
      }),
    });
    const payload = (await response.json()) as { result?: WagerTxReceipt | null };
    if (payload.result) return payload.result;
    await new Promise((resolve) => window.setTimeout(resolve, 2000));
  }
  throw new Error(`receipt not found for ${transactionHash}`);
}

function toQuantity(decimal: string) {
  return `0x${BigInt(decimal).toString(16)}`;
}

function uint256(value: bigint) {
  return value.toString(16).padStart(64, "0");
}

function addressArg(address: string) {
  return address.toLowerCase().replace(/^0x/, "").padStart(64, "0");
}
