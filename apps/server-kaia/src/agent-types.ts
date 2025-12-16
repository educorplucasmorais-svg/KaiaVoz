import { z } from "zod";

// Define a estrutura de uma Ferramenta Segura (Padrão Facade)
export interface SafeTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (args: any) => Promise<string>;
}

// Mensagem genérica para histórico
export interface BaseMessage {
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp?: Date;
}

// O estado da memória de curto prazo do agente
export interface AgentState {
  history: BaseMessage[];
  // Armazena dados contextuais voláteis (ex: chunks do RAG)
  contextData: Record<string, any>; 
}

// Configuração do Agente
export interface AgentConfig {
  modelName: string;      // ex: "llama3" ou "gpt-4o"
  temperature: number;    // Recomendado: 0 para precisão de ferramentas
  systemPrompt: string;
  baseUrl?: string;       // Opcional: para apontar para Ollama/LocalAI
  apiKey?: string;
}