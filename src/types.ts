export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  usedProvider?: string;
  usedModel?: string;
  fallbackLog?: string[];
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  provider: "gemini" | "nvidia" | "openrouter";
  model: string;
  autoFailover: boolean;
}

export interface ProviderConfig {
  geminiConfigured: boolean;
  nvidiaConfigured: boolean;
  openRouterConfigured: boolean;
}

export interface ModelOption {
  id: string;
  name: string;
  provider: "gemini" | "nvidia" | "openrouter";
}
