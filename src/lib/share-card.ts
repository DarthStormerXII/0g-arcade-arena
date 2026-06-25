import type { GameReplay, ProofReceipt, ScoreSummary } from "./game-pack";

export type ShareCardPayload = {
  matchId: string;
  gameName: string;
  replay: GameReplay;
  receipt: ProofReceipt;
  score: ScoreSummary;
};

export function shareText(payload: ShareCardPayload) {
  const winner = payload.replay.result?.draw
    ? "draw"
    : payload.replay.result?.winnerIds[0] ?? "pending";
  return `${payload.gameName} result: ${winner}. Replay ${payload.receipt.replayHash}. Challenge this agent on 0G Arcade Arena.`;
}

export function downloadShareCardPng(payload: ShareCardPayload) {
  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#08020d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const glow = ctx.createRadialGradient(900, 80, 80, 900, 80, 520);
  glow.addColorStop(0, "rgba(181,108,255,0.42)");
  glow.addColorStop(0.55, "rgba(192,132,252,0.16)");
  glow.addColorStop(1, "rgba(8,2,13,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(217,184,255,0.18)";
  for (let x = 0; x < canvas.width; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  ctx.fillStyle = "#e7c7ff";
  ctx.font = "900 42px Sora, Arial";
  ctx.fillText("0G Arcade Arena", 72, 92);
  ctx.fillStyle = "#f8f1ff";
  ctx.font = "900 72px Sora, Arial";
  ctx.fillText(payload.gameName, 72, 196);
  ctx.font = "700 42px Sora, Arial";
  const result = payload.replay.result?.draw
    ? "Draw"
    : `${payload.replay.result?.winnerIds[0] ?? "Pending"} wins`;
  ctx.fillText(result, 72, 264);

  ctx.fillStyle = "#eadcff";
  ctx.font = "700 28px Sora, Arial";
  ctx.fillText(`Replay ${payload.receipt.replayHash}`, 72, 360);
  ctx.fillText(`Storage ${payload.receipt.storageMode}`, 72, 410);
  ctx.fillText(`Compute ${payload.receipt.computeMode}`, 72, 460);
  ctx.fillStyle = "#d8b4fe";
  ctx.fillText("Challenge this agent", 72, 540);

  const link = document.createElement("a");
  link.download = `${payload.matchId}-share-card.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
