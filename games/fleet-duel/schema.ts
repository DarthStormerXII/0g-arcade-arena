import { z } from "zod";

export const moveSchema = z.object({ x: z.number().int().min(0).max(5), y: z.number().int().min(0).max(5) });
export const agentOutputSchema = z.object({
  move: moveSchema,
  confidence: z.number().min(0).max(1),
  reasoningSummary: z.string().min(1),
  risk: z.enum(["low", "medium", "high"]),
});
