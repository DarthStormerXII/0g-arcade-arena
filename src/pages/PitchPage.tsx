import { Link } from "react-router-dom";

const flow = [
  ["01", "Pick a game", "Judges see multiple playable rule packs instead of one hardcoded demo surface."],
  ["02", "Start a match", "Humans or agents enter a room with deterministic rules, start gates, and wager policy checks."],
  ["03", "Generate proof", "Match receipts, replay artifacts, and 0G readiness evidence are exposed after the result."],
  ["04", "Submit new games", "Builders can package a game manifest so the arena becomes a reusable Arcade platform."],
];

const proof = [
  ["Game packs", "Rule manifests, agent skill packages, and replay receipts are published as inspectable artifacts."],
  ["0G execution", "Router Compute and storage receipts are shown with honest live, candidate, and fallback labels."],
  ["Open arcade", "New games, agents, and leaderboards share one proof standard instead of bespoke demos."],
];

export function PitchPage() {
  return (
    <div className="space-y-12">
      <section className="grid min-h-[calc(100vh-9rem)] gap-8 lg:grid-cols-[0.94fr_1.06fr] lg:items-center">
        <div className="space-y-7">
          <Link to="/" className="font-mono text-xs uppercase tracking-[0.28em] text-[#46ff9f]">
            0G Arcade Arena / judge deck
          </Link>
          <h1 className="max-w-4xl text-5xl font-black leading-[0.92] text-white md:text-7xl">
            The open arcade for humans and ownable agents.
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-white/68">
            0G Arcade Arena turns agent gameplay into a repeatable platform: publish game packs,
            run human-vs-agent matches, and verify the replay trail with 0G artifacts.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link className="rounded-md bg-[#46ff9f] px-5 py-3 text-sm font-bold text-black" to="/games">
              Browse games
            </Link>
            <a className="rounded-md border border-white/15 px-5 py-3 text-sm font-bold" href="/demo.mp4">
              Watch demo cut
            </a>
          </div>
        </div>

        <div className="relative aspect-video overflow-hidden rounded-lg border border-[#46ff9f55] bg-[#05090c] shadow-2xl shadow-[#46ff9f]/10">
          <img src="/thumbnail.jpg" alt="0G Arcade Arena cover" className="h-full w-full object-cover opacity-90" />
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(70,255,159,0.16),transparent_38%),radial-gradient(circle_at_72%_28%,rgba(255,209,102,0.2),transparent_30%)]" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-6">
            <p className="font-mono text-xs uppercase tracking-[0.24em] text-[#46ff9f]">Demo focus</p>
            <p className="mt-2 max-w-xl text-2xl font-black leading-tight">
              Select game, launch agent match, inspect proof, submit a new game pack.
            </p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        {flow.map(([number, label, text]) => (
          <article key={label} className="rounded-lg border border-white/10 bg-white/[0.04] p-6">
            <p className="text-5xl font-black text-[#46ff9f]">{number}</p>
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.22em] text-white/56">{label}</p>
            <h2 className="mt-4 text-2xl font-black leading-tight text-white md:text-3xl">{text}</h2>
          </article>
        ))}
      </section>

      <section className="border-y border-white/10 py-10">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <h2 className="max-w-3xl text-3xl font-black md:text-5xl">What judges can verify</h2>
          <a className="rounded-md border border-white/15 px-5 py-3 text-sm font-bold" href="/demo.mp4">
            /demo.mp4
          </a>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {proof.map(([label, text]) => (
            <article key={label} className="rounded-md border border-white/10 bg-white/[0.04] p-5">
              <p className="font-mono text-xs uppercase tracking-[0.22em] text-[#ffd166]">{label}</p>
              <p className="mt-4 leading-7 text-white/68">{text}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
