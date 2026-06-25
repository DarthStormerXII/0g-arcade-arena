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
    <div className="min-h-screen overflow-hidden text-white">
      <video
        aria-hidden="true"
        className="fixed inset-0 h-full w-full object-cover opacity-20 mix-blend-screen"
        autoPlay
        loop
        muted
        playsInline
        src="/brand/hero.mp4"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(181,108,255,.34),transparent_36rem),linear-gradient(180deg,rgba(8,2,13,.46),rgba(8,2,13,.96)_64%)]"
      />
      <header className="sticky top-0 z-20 border-b border-[color:var(--arena-line)] bg-[#12051dcc] shadow-[0_16px_70px_rgba(0,0,0,.24)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="group flex items-center gap-3 font-black uppercase">
            <span className="grid h-11 w-11 place-items-center overflow-hidden rounded-full border border-[#d9b8ff66] bg-[#d9b8ff1a] shadow-[0_0_28px_rgba(181,108,255,.32)]">
              <img className="h-full w-full object-cover transition duration-500 group-hover:scale-110" src="/brand/logo.jpg" alt="" />
            </span>
            <span className="bg-gradient-to-r from-white via-[#e7c7ff] to-[#c084fc] bg-clip-text text-transparent">
              0G Arcade Arena
            </span>
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <nav className="flex flex-wrap gap-2 text-sm">
              {nav.map(([href, label]) => (
                <NavLink
                  key={href}
                  to={href}
                  className={({ isActive }) =>
                    `rounded-md px-3 py-2 ${isActive ? "bg-[#b56cff22] text-[#e8ccff] shadow-[inset_0_0_0_1px_rgba(213,174,255,.22)]" : "text-white/72 hover:bg-white/8"}`
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
      <main className="relative z-10 mx-auto max-w-7xl px-4 py-6">
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
