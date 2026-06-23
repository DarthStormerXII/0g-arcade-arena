import { PrivyProvider } from "@privy-io/react-auth";
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import "./styles/index.css";

const privyAppId = import.meta.env.VITE_PRIVY_APP_ID ?? "";
const galileo = {
  id: 16602,
  name: "0G Galileo Testnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://evmrpc-testnet.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Chainscan", url: "https://chainscan-galileo.0g.ai" },
  },
} as const;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <PrivyProvider
      appId={privyAppId}
      config={{
        appearance: {
          accentColor: "#46ff9f",
          showWalletLoginFirst: false,
          theme: "dark",
        },
        embeddedWallets: {
          ethereum: {
            createOnLogin: "users-without-wallets",
          },
          showWalletUIs: true,
        },
        defaultChain: galileo,
        loginMethods: ["email"],
        supportedChains: [galileo],
      }}
    >
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PrivyProvider>
  </React.StrictMode>,
);
