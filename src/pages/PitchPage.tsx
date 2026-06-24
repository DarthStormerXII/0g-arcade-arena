import { Link } from "react-router-dom";
import { Gamepad2, ShieldCheck } from "lucide-react";

const proofPoints = [
  "Four playable v1 games ship as validated game packs.",
  "A browser-clicked two-wallet Grid Four wager is proven on Galileo.",
  "Completed wager replays, all four game packs, and proof metadata are uploaded to 0G Storage.",
  "Agent move routing attempts 0G Compute and labels deterministic fallback honestly.",
];

const chapters = [
  ["Open arcade", "Players compete across Grid Four, Fleet Duel, Tile Race, and World Cup Draft."],
  ["Game packs", "Each pack carries rules, UI, schema, replay fixtures, assets, and agent instructions."],
  ["Agents", "Qualified agents can join rooms under wager caps and game-specific policy."],
  ["Explorer", "The technical surface shows chain, storage, agent, and fallback status in one place."],
];

export function PitchPage() {
  return (
    <div className="space-y-12">
      <section className="grid min-h-[calc(100vh-9rem)] gap-8 lg:grid-cols-[1fr_0.95fr] lg:items-center">
        <div className="space-y-7">
          <Link to="/" className="font-mono text-xs uppercase tracking-[0.26em] text-[#46ff9f]">
            0G Arcade Arena pitch deck
          </Link>
          <h1 className="max-w-4xl text-5xl font-black uppercase leading-none md:text-7xl">
            The open arcade for humans and ownable AI agents.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-white/70">
            0G Arcade Arena is a proof-carrying game platform where every match can produce
            replay, wager, game-pack, agent, and infrastructure evidence.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-[#46ff9f] px-5 py-3 text-sm font-black text-black" to="/games">
              Browse games
            </Link>
            <a className="rounded-md border border-white/15 px-5 py-3 text-sm font-black" href="/demo.mp4">
              Demo video
            </a>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border border-white/12 bg-white/[0.04] p-5">
          <div className="flex items-center gap-3 text-[#46ff9f]">
            <Gamepad2 />
            <span className="font-black uppercase">V1 platform proof</span>
          </div>
          {chapters.map(([label, text]) => (
            <article key={label} className="rounded-md border border-white/10 bg-black/30 p-4">
              <p className="font-mono text-xs uppercase tracking-[0.2em] text-[#46ff9f]">{label}</p>
              <h2 className="mt-3 text-xl font-black leading-tight">{text}</h2>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-white/10 py-10">
        <div className="mb-8 flex items-center gap-3">
          <ShieldCheck className="text-[#46ff9f]" />
          <h2 className="text-3xl font-black uppercase md:text-5xl">What judges can verify</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {proofPoints.map((point) => (
            <div key={point} className="rounded-md border border-white/10 bg-white/[0.04] p-5 text-white/70">
              {point}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
