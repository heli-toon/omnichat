import { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

// Helper for calling Gemini
async function tryGemini(messages: any[], model: string): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    throw new Error("GEMINI_API_KEY is missing on server");
  }

  const ai = new GoogleGenAI({
    apiKey: geminiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  // Reformat messages to fit Google GenAI schema
  const systemMsg = messages.find((m) => m.role === "system");
  const chatMsgs = messages.filter((m) => m.role !== "system");

  // Map roles to 'user' or 'model'
  const contents = chatMsgs.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const response = await ai.models.generateContent({
    model: model || "gemini-3.5-flash",
    contents,
    config: systemMsg ? { systemInstruction: systemMsg.content } : undefined,
  });

  const text = response.text;
  if (!text) {
    throw new Error("No text response received from Gemini API");
  }
  return text;
}

// Helper for calling NVIDIA NIM
async function tryNvidia(messages: any[], model: string): Promise<string> {
  const nvidiaKey = process.env.NVIDIA_API_KEY;
  if (!nvidiaKey) {
    throw new Error(
      "NVIDIA_API_KEY is missing in backend environment variables"
    );
  }

  const response = await fetch(
    "https://integrate.api.nvidia.com/v1/chat/completions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nvidiaKey}`,
      },
      body: JSON.stringify({
        model: model || "meta/llama-3.1-8b-instruct",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `NVIDIA NIM API Error (${response.status}): ${errorBody || response.statusText}`
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Empty completion returned from NVIDIA NIM");
  }
  return text;
}

// Helper for calling OpenRouter
async function tryOpenRouter(messages: any[], model: string): Promise<string> {
  const orKey = process.env.OPENROUTER_API_KEY;
  if (!orKey) {
    throw new Error(
      "OPENROUTER_API_KEY is missing in backend environment variables"
    );
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${orKey}`,
      "HTTP-Referer": process.env.APP_URL || "https://omnichat.vercel.app",
      "X-Title": "Multi-Model Chatbot Applet",
    },
    body: JSON.stringify({
      model: model || "meta-llama/llama-3.3-70b-instruct:free",
      messages: messages,
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(
      `OpenRouter API Error (${response.status}): ${errorBody || response.statusText}`
    );
  }

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error("Empty completion returned from OpenRouter");
  }
  return text;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { messages, provider, model, autoFailover } = req.body;

  if (!Array.isArray(messages) || messages.length === 0) {
    return res
      .status(400)
      .json({ error: "Invalid or empty messages array." });
  }

  const fallbackLog: string[] = [];
  const providersToTry: {
    name: string;
    runner: () => Promise<string>;
    defaultModel: string;
  }[] = [];

  const geminiOption = {
    name: "gemini",
    runner: () => tryGemini(messages, model || "gemini-3.5-flash"),
    defaultModel: "gemini-3.5-flash",
  };

  const nvidiaOption = {
    name: "nvidia",
    runner: () => tryNvidia(messages, model || "meta/llama-3.1-8b-instruct"),
    defaultModel: "meta/llama-3.1-8b-instruct",
  };

  const orOption = {
    name: "openrouter",
    runner: () =>
      tryOpenRouter(messages, model || "meta-llama/llama-3.3-70b-instruct:free"),
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
  };

  // Build the order based on preferred provider
  if (provider === "gemini") {
    providersToTry.push(geminiOption);
    if (autoFailover) {
      providersToTry.push(nvidiaOption, orOption);
    }
  } else if (provider === "nvidia") {
    providersToTry.push(nvidiaOption);
    if (autoFailover) {
      providersToTry.push(geminiOption, orOption);
    }
  } else if (provider === "openrouter") {
    providersToTry.push(orOption);
    if (autoFailover) {
      providersToTry.push(geminiOption, nvidiaOption);
    }
  } else {
    // Default to gemini-first fallover
    providersToTry.push(geminiOption, nvidiaOption, orOption);
  }

  // Attempt the models in order
  for (const p of providersToTry) {
    try {
      fallbackLog.push(
        `Attempting ${p.name} with model ${model || p.defaultModel}...`
      );
      const text = await p.runner();
      fallbackLog.push(`Success with ${p.name}!`);
      return res.json({
        success: true,
        text,
        usedProvider: p.name,
        usedModel: model || p.defaultModel,
        fallbackLog,
      });
    } catch (err: any) {
      const errMsg = err?.message || String(err);
      fallbackLog.push(`Failed ${p.name}: ${errMsg}`);
    }
  }

  // If all tried options fail
  return res.status(502).json({
    success: false,
    error: "All configured AI models and failover options failed.",
    fallbackLog,
  });
}
