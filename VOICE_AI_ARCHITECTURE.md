# 🎤 Arquitetura de IA de Voz - Kaia

Este documento descreve a arquitetura de reconhecimento de voz (ASR) e síntese de voz (TTS) do assistente Kaia, incluindo configurações otimizadas para baixa latência e alta precisão.

## 📋 Índice

1. [Visão Geral da Arquitetura](#visão-geral-da-arquitetura)
2. [Módulo de Captura de Áudio (VAD/I/O)](#módulo-de-captura-de-áudio-vadio)
3. [Reconhecimento de Fala (ASR)](#reconhecimento-de-fala-asr)
4. [Síntese de Voz (TTS)](#síntese-de-voz-tts)
5. [Otimização de Latência](#otimização-de-latência)
6. [Segurança](#segurança)
7. [Próximos Passos](#próximos-passos)

---

## Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Browser)                      │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  useSpeech Hook                                            │ │
│  │  ├─ Web Speech API (SpeechRecognition)                     │ │
│  │  ├─ VAD (Voice Activity Detection) integrado               │ │
│  │  ├─ Error Recovery com retry automático                    │ │
│  │  └─ Confidence scoring                                     │ │
│  └────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  useTTS Hook                                               │ │
│  │  ├─ ElevenLabs (premium, cloud)                            │ │
│  │  ├─ Edge TTS (Microsoft, cloud)                            │ │
│  │  └─ Web Speech API (browser, local)                        │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
              ↓ POST /api/ai/voice ↓
┌─────────────────────────────────────────────────────────────────┐
│                  BACKEND (Express/Node.js)                       │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  NeuralCoreAgent                                           │ │
│  │  ├─ Validação de segurança (bloqueio de comandos perigosos)│ │
│  │  ├─ Análise de intenção (6 tipos)                          │ │
│  │  ├─ Abbacus LLM (opcional, para respostas inteligentes)    │ │
│  │  └─ Pattern matching local (fallback)                      │ │
│  └────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Módulo de Captura de Áudio (VAD/I/O)

### Configuração do VAD (Voice Activity Detection)

O VAD é crítico para determinar quando o usuário começa e para de falar. A implementação atual usa a Web Speech API com configurações otimizadas:

```typescript
// apps/frontend/src/hooks/useSpeech.ts
const config = {
  silenceTimeout: 1500,  // 1.5s de silêncio = fim da fala
  maxDuration: 30000,    // 30s máximo de gravação
  autoRestart: true,     // Reiniciar automaticamente após silêncio
  maxRetries: 3          // Tentativas em caso de erro
}
```

### Parâmetros de Configuração

| Parâmetro | Valor Padrão | Descrição |
|-----------|--------------|-----------|
| `silenceTimeout` | 1500ms | Tempo de silêncio antes de finalizar a fala |
| `maxDuration` | 30000ms | Duração máxima de uma gravação |
| `autoRestart` | true | Reiniciar reconhecimento automaticamente |
| `maxRetries` | 3 | Número de tentativas em erros recuperáveis |

### Tratamento de Erros

A implementação trata os seguintes tipos de erros:

| Código | Descrição | Recuperável |
|--------|-----------|-------------|
| `no-speech` | Nenhuma fala detectada | ✅ Sim |
| `audio-capture` | Erro de captura de áudio | ✅ Sim |
| `not-allowed` | Permissão negada | ❌ Não |
| `network` | Erro de rede | ✅ Sim |
| `aborted` | Reconhecimento cancelado | ✅ Sim |
| `language-not-supported` | Idioma não suportado | ❌ Não |
| `service-not-allowed` | Serviço não disponível | ❌ Não |

---

## Reconhecimento de Fala (ASR)

### Implementação Atual: Web Speech API

**Vantagens:**
- ✅ Funciona nativamente no navegador
- ✅ Sem custo adicional
- ✅ Suporte a português brasileiro (pt-BR)
- ✅ Resultados em tempo real (interim results)

**Limitações:**
- ❌ Requer conexão com internet (usa servidores Google/Microsoft)
- ❌ Precisão variável dependendo do navegador
- ❌ Não funciona em todos os navegadores (Firefox tem suporte limitado)

### Recomendações para Melhoria (Futuro)

Para aplicações de produção com requisitos de baixa latência, considere:

#### 1. Faster-Whisper (Recomendado para pt-BR)

```python
# Exemplo de integração futura
from faster_whisper import WhisperModel

model = WhisperModel("large-v3", device="cuda", compute_type="float16")
segments, info = model.transcribe("audio.mp3", language="pt")
```

**Métricas esperadas:**
- Latência: 350-500ms para frases curtas
- WER (Word Error Rate): ~5-8% para pt-BR
- Requer GPU com CUDA

#### 2. Silero VAD (Detecção de Atividade de Voz)

```python
# Exemplo de integração futura
import torch
model, utils = torch.hub.load(repo_or_dir='snakers4/silero-vad', model='silero_vad')
get_speech_timestamps = utils[0]

# Processa chunk de áudio em < 1ms
speech_timestamps = get_speech_timestamps(audio, model)
```

**Benefícios:**
- Processamento em < 1ms por chunk
- Detecta início e fim de fala com precisão
- Funciona offline

---

## Síntese de Voz (TTS)

### Provedores Disponíveis

1. **ElevenLabs** (Premium)
   - Qualidade: ⭐⭐⭐⭐⭐
   - Latência: ~200-400ms
   - Custo: Pago por caractere
   - Configuração: `ELEVENLABS_API_KEY`

2. **Edge TTS** (Microsoft)
   - Qualidade: ⭐⭐⭐⭐
   - Latência: ~150-300ms
   - Custo: Gratuito
   - Vozes: `pt-BR-AntonioNeural`, `pt-BR-FranciscaNeural`

3. **Web Speech API** (Browser)
   - Qualidade: ⭐⭐⭐
   - Latência: ~50-100ms
   - Custo: Gratuito
   - Depende das vozes instaladas no sistema

### Configuração de TTS

```env
# apps/server/.env
ELEVENLABS_API_KEY=sk_xxxxx
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

---

## Otimização de Latência

### Metas de Latência

Para uma conversa fluida, a latência total deve ser < 600ms:

| Componente | Meta | Atual |
|------------|------|-------|
| VAD (detecção de fim de fala) | < 1ms | ~1ms ✅ |
| ASR (transcrição) | 350-500ms | ~300-500ms ✅ |
| LLM (TTFT) | 100-300ms | ~200-400ms ⚠️ |
| TTS (primeira sílaba audível) | 100-250ms | ~150-300ms ✅ |

### Estratégias de Otimização

#### 1. Streaming de Resposta

Implemente streaming dual para reduzir latência percebida:

```typescript
// Enviar tokens do LLM para TTS assim que gerados
async function* streamResponse(text: string) {
  const chunks = splitIntoSentences(text);
  for (const chunk of chunks) {
    yield chunk;
    // TTS começa a falar enquanto LLM ainda gera
    await speakChunk(chunk);
  }
}
```

#### 2. Cache Inteligente

```typescript
// apps/server/src/services/ai.ts
const responseCache = new Map<string, { response: string; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutos
```

#### 3. Prompt Engineering para Concisão

```
Responda de forma concisa em 1-3 frases.
Máximo 50 palavras.
```

---

## Segurança

### Validação de Comandos

O NeuralCoreAgent implementa validação de segurança para bloquear comandos perigosos:

```typescript
// apps/server/src/services/neuralcore.ts
const blockedPatterns = [
  /system32/i,
  /delete.*windows/i,
  /rm\s+-rf\s+\//i,
  /format\s+c:/i,
  /shutdown/i
]
```

### Operações Permitidas

```typescript
const allowedOperations = [
  'open_file',
  'search_file',
  'create_reminder',
  'get_time',
  'get_weather',
  'play_music',
  'volume_control'
]
```

### Recomendações de Segurança

1. **Sandboxing (Docker)**
   ```yaml
   # docker-compose.yml
   services:
     kaia-agent:
       image: kaia/agent
       security_opt:
         - no-new-privileges:true
       read_only: true
       tmpfs:
         - /tmp
   ```

2. **Princípio do Mínimo Privilégio (POLP)**
   - O agente nunca deve ter acesso direto ao shell
   - Use ferramentas (tools) tipadas com validação de argumentos
   - Confirme ações destrutivas com o usuário

3. **Ferramentas Proxy (Façade Pattern)**
   ```typescript
   // Nunca execute comandos diretos
   // Use funções proxy de alto nível
   const tools = {
     open_file: async (path: string) => {
       // Validar path antes de executar
       if (isPathSafe(path)) {
         return executeCommand(`start ${path}`)
       }
       throw new Error('Path não permitido')
     }
   }
   ```

---

## Próximos Passos

### Curto Prazo (1-2 semanas)

- [ ] Implementar Silero VAD para detecção de fim de fala mais precisa
- [ ] Adicionar métricas de latência no frontend
- [ ] Melhorar feedback visual durante processamento

### Médio Prazo (1-2 meses)

- [ ] Integrar Faster-Whisper para ASR local com GPU
- [ ] Implementar streaming de resposta TTS
- [ ] Adicionar suporte a wake word ("Oi Kaia")

### Longo Prazo (3-6 meses)

- [ ] Treinar modelo TTS customizado para pt-BR
- [ ] Implementar Voice Cloning para personalização
- [ ] Adicionar suporte a múltiplos idiomas

---

## Referências

- [Web Speech API MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Faster-Whisper GitHub](https://github.com/guillaumekln/faster-whisper)
- [Silero VAD GitHub](https://github.com/snakers4/silero-vad)
- [ElevenLabs API](https://elevenlabs.io/docs)
- [LangChain Documentation](https://js.langchain.com/docs/)

---

**Última atualização:** 16/12/2025
**Versão:** 1.1.0
