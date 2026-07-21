import { VercelRequest, VercelResponse } from "@vercel/node";

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.json({
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    nvidiaConfigured: !!process.env.NVIDIA_API_KEY,
    openRouterConfigured: !!process.env.OPENROUTER_API_KEY,
  });
}
