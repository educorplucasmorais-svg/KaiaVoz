import { z } from "zod";
import type { BaseMessage as LangChainBaseMessage } from "@langchain/core/messages";

// Define a estrutura de uma Ferramenta Segura (Padrão Facade)
export interface SafeTool {
  name: string;
  description: string;
  schema: z.ZodObject<any>;
  execute: (args: any) => Promise<string>;
}

// Re-export LangChain BaseMessage for type compatibility
export type BaseMessage = LangChainBaseMessage;

// O estado da memória de curto prazo do agente
export interface AgentState {
  history: LangChainBaseMessage[];
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