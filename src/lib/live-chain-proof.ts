export const liveChainProof = {
  mode: "live-0g-galileo-chain-smoke",
  verifiedAt: "2026-06-23T07:27:30.442Z",
  chainId: 16602,
  explorer: "https://chainscan-galileo.0g.ai",
  operator: "0x9BD46195661F61a323c3c8C82132dCDE72a3bcbC",
  balances: {
    operator: "0.078953927926478748",
    privyWallet: "0.048797519997895660",
  },
  deployments: [
    {
      name: "Game Registry",
      address: "0xd6734280cb3d702f5beba6c1ba3bcc6912b4872c",
      txHash: "0xa993932c761bcc8cf24f804fcd328619bdeb0778caa7fde78d7cd131689c7214",
      blockNumber: 40270428,
    },
    {
      name: "Match Registry",
      address: "0xbfbe80a1907e3cbfc2c2598c8d9fb9665ff0d2a7",
      txHash: "0x49fb413ecf5e0379c2db1cc7838b73e6a9a1951e3f653ab85e848b2dd48b4dcc",
      blockNumber: 40270451,
    },
    {
      name: "Wager Escrow",
      address: "0xd58960a15e1036efde2ca873716396c0f47031d4",
      txHash: "0x79e44d648c8f72aa4b719adec4f5b40f57dd57c9582145368c4120fb7eb2fa51",
      blockNumber: 40270474,
    },
    {
      name: "Future Tournament Registry",
      address: "0xd8524b7699c37775221d53c0de8c0d74ef93ce0c",
      txHash: "0x14b236b1fbd7761c6089f72bb426aaa1aed7c1c781f25d0ef82b28707e8a18da",
      blockNumber: 40270498,
    },
    {
      name: "Agent Registry",
      address: "0x130d276aa665dfeb10df3aee81be73b1e55495b2",
      txHash: "0x5b2fb0cf7d9d9a2a6ae8ef2d37cf23461f0dbf58af9450873b395e4bd9982649",
      blockNumber: 40270522,
    },
    {
      name: "Contributor Registry",
      address: "0xf0cd6539f1677b4c141484509a194fe6635e3a9a",
      txHash: "0x19f6e9592d53a7ce39496c49d159f9f0197dd54f84436eded8986bda65ebe8a6",
      blockNumber: 40270543,
    },
  ],
  transactions: [
    {
      name: "Register game version",
      txHash: "0xa6b46a8ca6f22462e48207909bd40411bc68edbe9a72615060a001d81b1209e7",
      blockNumber: 40270565,
    },
    {
      name: "Create match",
      txHash: "0x8e00d4f57367aa161e3f8c6599a98c5f3997b4e46e2c6e04f2ac6787ec7d65fc",
      blockNumber: 40270583,
    },
    {
      name: "Commit result",
      txHash: "0x0fe84002b909342f58ad01fbddb4e277aa92e5ed7b2ae3711ee82f71dceee247",
      blockNumber: 40270603,
    },
    {
      name: "Create wager",
      txHash: "0xb2e48f9a411c449123a0056b0c04833692175b217550b6899c13a62d4b7b8cfe",
      blockNumber: 40270622,
    },
    {
      name: "Settle winner",
      txHash: "0x784267699293ec4fd690cb0ea396478a17adb1a226b81081a6b14927335f27cf",
      blockNumber: 40270645,
    },
    {
      name: "Record future tournament result",
      txHash: "0xbb1d1ead37391f1b08b52200ab69b12ad186d48240ff103ffbe1210be8729b85",
      blockNumber: 40270663,
    },
    {
      name: "Register agent",
      txHash: "0x1a339c3e2b6e61df002d6a786386933d08c58b0e1e4bd0d49103e934b4408912",
      blockNumber: 40270684,
    },
    {
      name: "Update rating",
      txHash: "0xa43b0dac7ca56cf8e62e485869d81f8268521ff467db94be1a5dccf43e6fbbd5",
      blockNumber: 40270701,
    },
    {
      name: "Record contributor credit",
      txHash: "0x3ce622842df959f86ab455de9d2f29a80606f16ad8cd1d5a9712f47fc8683a47",
      blockNumber: 40270723,
    },
  ],
  scope: {
    chain: "Live Galileo deployment and registry writes verified.",
    storage: "No 0G Storage upload claimed; storage remains local fallback.",
    compute: "No 0G Compute execution claimed; agents remain deterministic fallback.",
    da: "No 0G DA publication claimed.",
  },
} as const;

export function shortHash(value: string) {
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}
