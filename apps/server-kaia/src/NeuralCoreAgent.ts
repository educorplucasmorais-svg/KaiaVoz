import { ChatOpenAI } from "@langchain/openai";
import { SystemMessage, HumanMessage, AIMessage, BaseMessage as LangChainBaseMessage } from "@langchain/core/messages";
// import type { SafeTool, AgentState, AgentConfig, BaseMessage } from "./agent-types";

// Tipos inline para evitar erro de import
interface SafeTool {
  name: string;
  description: string;
  schema: any;
  execute: (args: any) => Promise<string>;
}

interface AgentState {
  history: LangChainBaseMessage[];
  contextData: Record<string, any>; 
}

interface AgentConfig {
  modelName: string;
  temperature: number;
  systemPrompt: string;
  baseUrl?: string;
  apiKey?: string;
}

export class NeuralCoreAgent {
  private llm: ChatOpenAI;
  private tools: Record<string, SafeTool>; 
  private state: AgentState;
  private systemPrompt: string;

  constructor(config: AgentConfig, tools: SafeTool[]) {
    this.llm = new ChatOpenAI({
      modelName: config.modelName,
      temperature: config.temperature,
      configuration: {
        baseURL: config.baseUrl,
        apiKey: config.apiKey || "dummy-key",
      },
    });

    this.systemPrompt = config.systemPrompt;
    
    this.state = {
      history: [],
      contextData: {}, 
    };

    // Mapeia ferramentas para acesso rápido O(1)
    this.tools = tools.reduce((acc, t) => {
      acc[t.name] = t;
      return acc;
    }, {} as Record<string, SafeTool>);
  }

  public resetSession() {
    this.state.history = [];
    this.state.contextData = {};
  }

  public async processInput(userInput: string): Promise<{ audioText: string; actionResult?: string }> {
    // 1. Histórico
    this.state.history.push(new HumanMessage(userInput));

    // 2. Monta mensagens
    const messages = [
      new SystemMessage(this.systemPrompt),
      ...this.state.history
    ];

    // 3. Inferência
    const response = await this.llm.invoke(messages);
    const fullResponseText = response.content as string;
    
    this.state.history.push(new AIMessage(fullResponseText));

    // 4. Parsing <thought> vs <speak>
    const thoughtMatch = fullResponseText.match(/<thought>([\s\S]*?)<\/thought>/);
    const speakMatch = fullResponseText.match(/<speak>([\s\S]*?)<\/speak>/);

    const thoughtContent = thoughtMatch ? thoughtMatch[1].trim() : "";
    // Fallback: se não houver tags, usa o texto todo como fala (exceto tags de thought)
    const speakContent = speakMatch 
      ? speakMatch[1].trim() 
      : fullResponseText.replace(/<thought>[\s\S]*?<\/thought>/, "").trim();

    // 5. Verifica Ferramentas
    let actionResult = undefined;
    if (thoughtContent.includes("USE_TOOL:")) {
        actionResult = await this.executeToolFromThought(thoughtContent);
    }

    return {
      audioText: speakContent,
      actionResult: actionResult
    };
  }

  private async executeToolFromThought(thought: string): Promise<string> {
    try {
      // Regex: USE_TOOL: nome {json}
      const match = thought.match(/USE_TOOL:\s*(\w+)\s*(\{.*\})/s);
      if (!match) return "Erro: Formato inválido.";

      const [_, toolName, argsString] = match;
      const tool = this.tools[toolName];

      if (!tool) {
        console.warn(`[SEC] Tool não autorizada: ${toolName}`);
        return "Erro: Ação não autorizada.";
      }

      let args;
      try {
        args = JSON.parse(argsString);
      } catch {
        return "Erro: JSON inválido nos argumentos.";
      }

      const validation = tool.schema.safeParse(args);
      if (!validation.success) {
        return `Erro de validação: ${validation.error.message}`;
      }

      console.log(`[NeuralCore] Executando: ${toolName}`);
      return await tool.execute(args);

    } catch (e) {
      console.error("Erro na execução:", e);
      return "Erro interno.";
    }
  }
}