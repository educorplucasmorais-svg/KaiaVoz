# GitHub Copilot Quick Start - NeuralCore Integration

## 📂 Arquivos NeuralCore - Localização Rápida

### **Arquivos Principais (Production)**
- 🔹 [apps/server/src/services/neuralcore.ts](apps/server/src/services/neuralcore.ts) - **NeuralCoreAgent** principal
- 🔹 [apps/server/src/routes/ai.ts](apps/server/src/routes/ai.ts) - **API endpoints** `/api/ai/voice` e `/api/ai/process`
- 🔹 [apps/frontend/src/hooks/useNeuralCore.ts](apps/frontend/src/hooks/useNeuralCore.ts) - **React hook** para integração

### **Arquivos Alternativos (server-kaia)**
- 🔹 [apps/server-kaia/src/NeuralCoreAgent.ts](apps/server-kaia/src/NeuralCoreAgent.ts) - Versão alternativa com tipos
- 🔹 [apps/server-kaia/src/server-integration.ts](apps/server-kaia/src/server-integration.ts) - Integração de servidor

### **Frontend Integration**
- 🔹 [apps/frontend/src/App.tsx](apps/frontend/src/App.tsx) - App principal integrado
- 🔹 [apps/frontend/src/hooks/useSpeech.ts](apps/frontend/src/hooks/useSpeech.ts) - STT com permission automática

## 🚀 Quick Commands

```bash
# Iniciar desenvolvimento
npm install
npm run dev

# Rodar frontend (porta 5173)
npm run dev --workspace=@kaia/frontend

# Rodar backend (porta 3060)
npm run dev --workspace=@kaia/server

# Fazer build
npm run build
```

## 📊 Fluxo de Dados

```
[Frontend Speech Input]
    ↓
[useNeuralCore Hook]
    ↓
POST /api/ai/voice
    ↓
[NeuralCoreAgent.processVoiceCommand()]
    ↓
[Analyze Intent] → {greeting|reminder|command|question|system_control|conversation}
    ↓
[Generate Response] → {thought, speak, toolCall?}
    ↓
[Speaker Output via ElevenLabs TTS]
```

## 🎯 6 Intent Types

| Intent | Exemplo | Handler |
|--------|---------|---------|
| **greeting** | "Olá", "Como vai?" | `handleGreeting()` |
| **reminder** | "Lembrar-me de... às 3pm" | `handleReminder()` |
| **command** | "Abrir arquivo.txt", "Aumentar volume" | `handleFileOperation()`, `handleSystemControl()` |
| **question** | "Qual é a data de hoje?" | `handleQuestion()` |
| **system_control** | "Pausar música", "Mute" | `handleSystemControl()` |
| **conversation** | Texto livre | Default response |

## 🔐 Security Features

- **Regex-based blocker** para patterns perigosos (system32, delete, shutdown, etc.)
- **Validação antes de processar** qualquer comando
- **Confirmação necessária** para operações de arquivo

## 📝 Response Format

```typescript
interface NeuralCoreResponse {
  thought: string;      // Análise do intent
  speak: string;        // O que o sistema fala
  toolCall?: {
    type: 'reminder' | 'file_operation' | 'system_control';
    action: string;
    data?: any;
  };
}
```

## 🔧 Configuração

### ElevenLabs TTS
```bash
# Copiar .env.example para .env
cp apps/server/.env.example apps/server/.env

# Adicionar suas credenciais
ELEVEN_LABS_API_KEY=sk_xxxxx
ELEVEN_LABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM  # Rachel
```

### Web Speech API
- Automático no navegador (português pt-BR)
- Funciona offline
- Fallback para síntese do navegador se ElevenLabs falhar

## 📚 Documentação Completa

Veja [NEURALCORE_GUIDE.md](NEURALCORE_GUIDE.md) para:
- Arquitetura completa
- Guia de desenvolvimento
- API reference completa
- Exemplos de extensão

## ⚡ Dicas para GitHub Copilot

### Para adicionar novo intent type:

1. Edite `apps/server/src/services/neuralcore.ts`
2. Adicione padrão em `analyzeIntent()`:
```typescript
if (/seu_padrão/i.test(text)) return 'seu_tipo';
```

3. Adicione handler em `generateResponse()`:
```typescript
case 'seu_tipo':
  return this.handleSeuTipo(text);
```

4. Implemente o handler:
```typescript
private handleSeuTipo(text: string): NeuralCoreResponse {
  // Sua lógica aqui
}
```

### Para adicionar nova rota API:

1. Crie arquivo em `apps/server/src/routes/novo.ts`
2. Importe em `apps/server/src/index.ts`
3. Registre: `app.use('/api/novo', novoRouter)`

## 🐛 Troubleshooting

**Copilot não encontra arquivo?**
→ Execute `git add -A && git commit && git push`

**Port já em uso?**
→ `npm run dev` automáticamente usa próxima porta disponível

**Microphone não pedindo permissão?**
→ Verifique `apps/frontend/src/hooks/useSpeech.ts` - `requestMicPermission()` deve ser chamado em `useEffect`

**Backend não responde?**
→ Verifique proxy em `apps/frontend/vite.config.ts` - deve apontar para `http://localhost:3060`

## 📞 API Examples

### Request
```bash
curl -X POST http://localhost:3060/api/ai/voice \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Lembrar-me de comprar leite às 3 da tarde",
    "userId": "user123"
  }'
```

### Response
```json
{
  "thought": "User wants to set a reminder",
  "speak": "Anotei. Vou lembrar você de comprar leite às 3 da tarde",
  "toolCall": {
    "type": "reminder",
    "action": "create",
    "data": {
      "text": "comprar leite",
      "time": "15:00"
    }
  }
}
```

---

**Última atualização**: Dezembro 2024
**Status**: ✅ Production-Ready
**GitHub**: https://github.com/educorplucasmorais-svg/KaiaVoz
