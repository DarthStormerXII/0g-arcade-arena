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

  ctx.fillStyle = "#080b0e";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "rgba(70,255,159,0.18)";
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

  ctx.fillStyle = "#46ff9f";
  ctx.font = "900 42px Arial";
  ctx.fillText("0G Arcade Arena", 72, 92);
  ctx.fillStyle = "#f8fffb";
  ctx.font = "900 72px Arial";
  ctx.fillText(payload.gameName, 72, 196);
  ctx.font = "700 42px Arial";
  const result = payload.replay.result?.draw
    ? "Draw"
    : `${payload.replay.result?.winnerIds[0] ?? "Pending"} wins`;
  ctx.fillText(result, 72, 264);

  ctx.fillStyle = "#9ff0ff";
  ctx.font = "700 28px Arial";
  ctx.fillText(`Replay ${payload.receipt.replayHash}`, 72, 360);
  ctx.fillText(`Storage ${payload.receipt.storageMode}`, 72, 410);
  ctx.fillText(`Compute ${payload.receipt.computeMode}`, 72, 460);
  ctx.fillStyle = "#ffe66d";
  ctx.fillText("Challenge this agent", 72, 540);

  const link = document.createElement("a");
  link.download = `${payload.matchId}-share-card.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
