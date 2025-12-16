# 🎙️ Integrando sua Voz Customizada do ElevenLabs

## ✅ Status Atual

- ✅ Backend ElevenLabs configurado
- ✅ Frontend com painel de vozes
- ✅ API key do ElevenLabs já inserida
- ✅ Suporte a múltiplas vozes

## 📝 Como Usar Sua Voz Customizada

### Passo 1: Obter o Voice ID do ElevenLabs

1. Acesse https://elevenlabs.io/app/voice-lab
2. Vá para **"Your Voices"** (Suas Vozes)
3. Encontre sua voz customizada
4. Clique em **"Copy Voice ID"** (há um ícone de cópia)

### Passo 2: Atualizar o `.env` do Backend

1. Abra o arquivo: `apps/server/.env`
2. Localize a linha `ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM`
3. Substitua o ID (21m00Tcm4TlvDq8ikWAM) pelo ID da sua voz
4. Salve o arquivo

**Exemplo:**
```dotenv
# Antes:
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Depois (com sua voz):
ELEVENLABS_VOICE_ID=VR6AewLHlfcoFD7XXXXXXX
```

### Passo 3: Reiniciar o Backend

O servidor vai detectar automaticamente a mudança (via ts-node-dev) e usar a nova voz.

Se quiser forçar um restart:
```bash
# Parar e reiniciar
npm run dev:server
```

### Passo 4: Testar no Frontend

1. Abra http://localhost:5173/
2. Clique em "⚙️ Configurações"
3. No painel de "Voz da Kaia":
   - Se vir "ElevenLabs (Premium)" em roxo → OK!
   - Selecione sua voz na dropdown
   - Clique em "▶️ Testar Voz"

---

## 🎯 Arquivos Relevantes

| Arquivo | Propósito |
|---------|-----------|
| `apps/server/.env` | Configuração de API key e Voice ID |
| `apps/server/src/routes/tts.ts` | Lógica de TTS (ElevenLabs, Edge, Browser) |
| `apps/frontend/src/hooks/useTTS.ts` | Hook React para síntese de fala |
| `apps/frontend/src/components/VoiceSettings.tsx` | Painel de seleção de voz |

---

## 🔍 Verificar Qual Provider Está Ativo

### No Backend (log)
```
KAIA server listening on http://localhost:3060
✓ ElevenLabs TTS configured  ← Aparecerá se API key válida
```

### No Frontend
Abra `http://localhost:5173/` e procure por:
- Badge roxa "ElevenLabs (Premium)" → Está ativo
- Badge azul "Edge TTS" → Fallback
- Sem badge → Usando browser nativo

---

## 💡 Dicas

### Para testar múltiplas vozes rapidamente:

1. Vá para https://elevenlabs.io/app/voice-lab
2. Teste cada voz diretamente no site
3. Copie os IDs das vozes que gostar
4. Atualize `.env` e teste no Kaia

### Para melhor qualidade de áudio:

```dotenv
# Configurações padrão (já estão otimizadas)
ELEVENLABS_MODEL_ID=eleven_multilingual_v2
```

Modelos disponíveis:
- `eleven_multilingual_v2` ✅ Recomendado (multilíngue)
- `eleven_turbo_v2` (mais rápido, menos qualidade)
- `eleven_monolingual_v1` (específico por idioma)

### Entender a resposta do painel de voz:

```
Voz da Kaia: [Dropdown com vozes] | ElevenLabs (Premium)
↓ Spinner girando = Carregando vozes do servidor
↓ Vozes listadas = Pronto para usar
```

---

## ⚙️ Estrutura de Requisição

Quando você clica em "Testar Voz", o frontend faz:

```json
POST /api/tts
{
  "text": "Olá, eu sou a Kaia.",
  "voice": "VR6AewLHlfcoFD7XXXXXXX",  // Seu Voice ID
  "rate": "+0%",
  "pitch": "+0Hz"
}
```

O backend então:
1. Recebe a requisição
2. Valida a voz (se for Voice ID válido do ElevenLabs)
3. Chama a API do ElevenLabs
4. Retorna áudio em MP3
5. Frontend toca o áudio

---

## 🆘 Troubleshooting

### Problema: Dropdown de vozes vazio
**Solução:**
- Verifique se o backend está rodando (deve ver "listening on 3060")
- Verifique se ELEVENLABS_API_KEY está configurada
- Abra DevTools (F12) → Console → veja se há erros

### Problema: "ElevenLabs (Premium)" não aparece
**Solução:**
- Verifique o `.env` → API_KEY preenchida?
- Verifique se a key é válida (comece com `sk_`)
- Reinicie o backend

### Problema: Som com ruído/qualidade baixa
**Solução:**
- Reduza taxa de velocidade em "Velocidade" (ex: -10%)
- Ajuste tom se desejar (ex: -1Hz)
- Teste diferentes vozes

### Problema: Erro 500 na rota /api/tts
**Solução:**
- Verifique logs do backend (terminal)
- Verifique se Voice ID está correto (deve ser string com ~24 chars)
- Teste com um Voice ID padrão (21m00Tcm4TlvDq8ikWAM)

---

## 📊 Fluxo Completo

```
[Você fala "Oi Kaia"]
    ↓
[useSpeech Hook] STT (Web Speech API)
    ↓
[useNeuralCore Hook] Análise de intenção
    ↓
[App.tsx] Gera resposta
    ↓
[useTTS Hook] → POST /api/tts
    ↓
[Backend tts.ts] → ElevenLabs API
    ↓
[ElevenLabs] Síntese com sua voz
    ↓
[Audio MP3] ← retorna ao frontend
    ↓
[Audio.play()] Toca no navegador
    ↓
[Chat Log] Exibe conversa
```

---

## 🚀 Próximas Melhorias Sugeridas

1. **Salvar preferência de voz**: localStorage já faz isso!
2. **Modo night/light**: Tema alternativo
3. **Múltiplos idiomas**: Adicione pt-PT, es-ES, en-US
4. **Histórico de conversas**: Persista em banco de dados
5. **Analytics**: Qual intent type é mais usado?

---

**Data**: Dezembro 2024
**Status**: ✅ ElevenLabs Integrado e Funcionando
**Próximo passo**: Adicione seu Voice ID customizado ao `.env`
