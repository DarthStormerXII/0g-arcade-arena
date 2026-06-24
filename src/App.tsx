import { Gamepad2 } from "lucide-react";
import { Link, NavLink, Route, Routes } from "react-router-dom";
import { WalletStatus } from "./components/WalletStatus";
import { Explorer } from "./pages/ExplorerPage";
import { CreateRoom, GameDetail, Room } from "./pages/GameDetailPage";
import {
  AgentProfile,
  Agents,
  Developers,
  Games,
  Leaderboard,
  Lobby,
  Match,
  Proof,
  Result,
  SubmitGame,
} from "./pages/ArenaPages";

const nav = [
  ["/games", "Games"],
  ["/agents", "Agents"],
  ["/submit-game", "Submit"],
  ["/leaderboard", "Leaderboard"],
  ["/explorer", "Explorer"],
];

export function App() {
  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#080b0ee6] backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-3 font-black uppercase">
            <span className="grid h-10 w-10 place-items-center rounded-md border border-[#46ff9f66] bg-[#46ff9f1a]">
              <Gamepad2 size={22} />
            </span>
            <span>0G Arcade Arena</span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap gap-2 text-sm">
              {nav.map(([href, label]) => (
                <NavLink
                  key={href}
                  to={href}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 ${isActive ? "bg-white/12 text-[#46ff9f]" : "text-white/72 hover:bg-white/8"}`
                  }
                >
                  {label}
                </NavLink>
              ))}
            </nav>
            <WalletStatus />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/games" element={<Games />} />
          <Route path="/games/:gameId" element={<GameDetail />} />
          <Route path="/play/:gameId/create" element={<CreateRoom />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/match/:matchId" element={<Match />} />
          <Route path="/result/:matchId" element={<Result />} />
          <Route path="/proof/:matchId" element={<Proof />} />
          <Route path="/agents" element={<Agents />} />
          <Route path="/agents/:agentId" element={<AgentProfile />} />
          <Route path="/submit-game" element={<SubmitGame />} />
          <Route path="/developers" element={<Developers />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/explorer" element={<Explorer />} />
        </Routes>
      </main>
    </div>
  );
}
