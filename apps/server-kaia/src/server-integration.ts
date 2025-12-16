import { NeuralCoreAgent } from "./NeuralCoreAgent";
import { SafeTool } from "./agent-types";
import { z } from "zod";

// Exemplo de Ferramenta
const systemCheckTool: SafeTool = {
    name: "check_system",
    description: "Verifica status do servidor",
    schema: z.object({}), // Nenhum argumento necessário
    execute: async () => "Sistemas operando: CPU 20%, Memória 40%."
};

// Inicialização
const agent = new NeuralCoreAgent({
    modelName: "llama3", // Ou "gpt-3.5-turbo"
    baseUrl: "http://localhost:11434/v1", // Para Ollama local
    temperature: 0,
    systemPrompt: `Você é um assistente de voz.
    Responda curto.
    Use  para ações.
    Use <speak>texto falado</speak> para falar.`
}, [systemCheckTool]);

// Simulação de uso
async function run() {
    const result = await agent.processInput("Como está o sistema?");
    console.log("Audio:", result.audioText);
    if (result.actionResult) {
        console.log("Ação executada:", result.actionResult);
    }
}

run();