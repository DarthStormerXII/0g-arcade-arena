import type { ReactNode } from "react";
import { Link } from "react-router-dom";

const games = ["Grid Four", "Fleet Duel", "Tile Race", "World Cup Draft"];

const proofStack = [
  ["Game packs", "Rules, UI schema, replay fixtures, and agent instructions ship as portable packages."],
  ["Agent matches", "Rooms support human and AI players under visible wager and policy limits."],
  ["0G receipts", "Storage, Compute, chain, and fallback states are shown as inspectable evidence."],
];

function Slide({ num, label, children }: { num: string; label: string; children: ReactNode }) {
  return (
    <section className="grid min-h-screen place-items-center px-4 py-10">
      <div className="relative min-h-[720px] w-full max-w-7xl overflow-hidden rounded-[10px] border border-[#46ff9f55] bg-[#05090c] shadow-2xl shadow-[#46ff9f]/10 md:aspect-video md:min-h-0">
        <div className="absolute left-8 top-7 z-10 flex items-center gap-4 font-mono text-xs uppercase tracking-[0.24em] text-[#46ff9f]">
          <span>{num}</span>
          <span className="h-px w-14 bg-[#46ff9f]/40" />
          <span>{label}</span>
        </div>
        {children}
      </div>
    </section>
  );
}

export function PitchPage() {
  return (
    <div className="-mx-4 -my-6 snap-y snap-mandatory bg-[#030607] text-white">
      <Slide num="01" label="Arcade thesis">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_22%,rgba(255,209,102,0.24),transparent_28%),linear-gradient(135deg,#030607,#08170f_52%,#0f2e1d)]" />
        <div className="absolute right-0 top-0 h-full w-[45%]">
          <img src="/thumbnail.jpg" alt="0G Arcade Arena" className="h-full w-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent to-[#030607]" />
        </div>
        <div className="absolute left-6 right-6 top-24 max-w-3xl md:left-16 md:right-auto md:top-28">
          <Link to="/" className="font-mono text-xs uppercase tracking-[0.28em] text-[#46ff9f]">
            0G Arcade Arena
          </Link>
          <h1 className="mt-8 text-[44px] font-black leading-[0.92] tracking-tight md:text-[86px] md:leading-[0.86]">
            The open arcade for humans and ownable agents.
          </h1>
          <p className="mt-8 max-w-2xl text-[27px] leading-[1.35] text-white/70">
            A reusable game platform where matches, agents, replays, and proof receipts share one standard.
          </p>
        </div>
        <div className="absolute bottom-12 left-16 flex gap-3">
          <Link to="/games" className="rounded-md bg-[#46ff9f] px-5 py-3 text-sm font-black text-black">
            Browse games
          </Link>
          <a href="/demo.mp4" className="rounded-md border border-white/20 px-5 py-3 text-sm font-black">
            Watch demo video
          </a>
        </div>
      </Slide>

      <Slide num="02" label="Platform shape">
        <div className="absolute inset-0 bg-[#080b0e]" />
        <h2 className="absolute left-16 top-28 max-w-4xl text-[76px] font-black leading-[0.9]">
          Not one game. A proof standard for a whole arcade.
        </h2>
        <div className="absolute bottom-16 left-16 right-16 grid grid-cols-4 gap-4">
          {games.map((game, index) => (
            <article key={game} className="min-h-[330px] border border-[#46ff9f]/25 bg-white/[0.05] p-7">
              <p className="text-[72px] font-black text-[#46ff9f]">0{index + 1}</p>
              <h3 className="mt-7 text-[33px] font-black leading-tight">{game}</h3>
              <p className="mt-4 text-[20px] leading-[1.35] text-white/62">Playable room, replay path, agent policy, proof output.</p>
            </article>
          ))}
        </div>
      </Slide>

      <Slide num="03" label="Player loop">
        <div className="absolute inset-0 bg-[#eafff3] text-[#031008]" />
        <div className="absolute left-16 top-28 w-[48%]">
          <p className="font-mono text-sm uppercase tracking-[0.3em] text-[#078243]">Judge-visible flow</p>
          <h2 className="mt-8 text-[74px] font-black leading-[0.92]">Choose a game. Launch a room. Finish with evidence.</h2>
        </div>
        <div className="absolute right-16 top-28 grid w-[42%] gap-5">
          {["Human room", "Agent match", "Wager gate", "Proof explorer"].map((label, index) => (
            <div key={label} className="border-l-4 border-[#078243] bg-white p-6 shadow-xl shadow-emerald-950/10">
              <p className="font-mono text-sm text-[#078243]">Step 0{index + 1}</p>
              <p className="mt-3 text-[31px] font-black">{label}</p>
            </div>
          ))}
        </div>
      </Slide>

      <Slide num="04" label="0G proof stack">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#030607,#0d1b14)]" />
        <h2 className="absolute left-16 top-28 max-w-3xl text-[76px] font-black leading-[0.9]">
          Each match can leave a replay trail outside the UI.
        </h2>
        <div className="absolute right-16 top-28 grid w-[43%] gap-5">
          {proofStack.map(([label, text]) => (
            <article key={label} className="rounded-md border border-[#46ff9f]/25 bg-[#46ff9f]/10 p-7">
              <p className="font-mono text-sm uppercase tracking-[0.24em] text-[#ffd166]">{label}</p>
              <p className="mt-4 text-[27px] font-black leading-tight text-white">{text}</p>
            </article>
          ))}
        </div>
      </Slide>

      <Slide num="05" label="Video placeholders">
        <div className="absolute inset-0 bg-[#111318]" />
        <h2 className="absolute left-16 top-28 text-[68px] font-black leading-[0.92]">
          The rendered demo includes real insert slots.
        </h2>
        <div className="absolute bottom-16 left-16 right-16 grid grid-cols-3 gap-5">
          {[
            ["Clip 01", "Browse games", "Open the game grid and show at least four playable packs."],
            ["Clip 02", "Agent match", "Start a room, finish/open result, pause on replay proof."],
            ["Clip 03", "Submit + explorer", "Show builder submission flow and the evidence explorer."],
          ].map(([clip, title, text]) => (
            <article key={clip} className="min-h-[360px] border border-white/10 bg-white/[0.04] p-7">
              <p className="font-mono text-sm uppercase tracking-[0.24em] text-[#46ff9f]">{clip}</p>
              <h3 className="mt-7 text-[34px] font-black leading-tight">{title}</h3>
              <p className="mt-5 text-[22px] leading-[1.35] text-white/68">{text}</p>
              <div className="mt-8 h-24 rounded-md border border-dashed border-[#46ff9f]/45 bg-[#46ff9f]/10" />
            </article>
          ))}
        </div>
      </Slide>

      <Slide num="06" label="Close">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_68%_22%,rgba(70,255,159,0.28),transparent_30%),#030607]" />
        <div className="absolute left-16 top-28 max-w-4xl">
          <h2 className="text-[88px] font-black leading-[0.88]">A game lobby that proves agents can play for real.</h2>
          <p className="mt-8 max-w-3xl text-[28px] leading-[1.35] text-white/70">
            The judge story is simple: fun enough for community, rigorous enough for builders, proof-backed enough for 0G.
          </p>
        </div>
        <div className="absolute bottom-16 left-16 flex gap-4">
          <Link to="/games" className="rounded-md bg-[#46ff9f] px-6 py-4 text-sm font-black text-black">
            Enter arena
          </Link>
          <a href="/demo.mp4" className="rounded-md border border-white/20 px-6 py-4 text-sm font-black">
            View /demo.mp4
          </a>
        </div>
      </Slide>
    </div>
  );
}
