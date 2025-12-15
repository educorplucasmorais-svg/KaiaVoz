# Kaia Monorepo

Kaia é um assistente virtual com dois modos: "Kaia - Código" e "Kaia - Assistente". Este monorepo contém:

- `apps/frontend`: Web app (React + Vite + TypeScript + Tailwind) para UI, voz (STT/TTS) e controle de modos.
- `apps/server`: API (Node + Express + TypeScript + Prisma) para reminders, agenda e logs.
- `apps/agent-win`: Agente local Windows (Node) que executa comandos em tempo real via WebSocket.
- `packages/shared`: Tipos e protocolo compartilhados.

## Requisitos
- Node 18+
- NPM 9+
- Windows (para agente local)
- MySQL (Hostinger) — preencha `.env` do `server` com `DATABASE_URL`.

## Desenvolvimento
1. Instale as dependências na raiz:
   ```powershell
   npm install
   ```
2. Inicie o agente local (para executar comandos do Windows):
   ```powershell
   npm run -w @kaia/agent-win dev
   ```
3. Inicie o backend:
   ```powershell
   npm run -w @kaia/server dev
   ```
4. Inicie o frontend:
   ```powershell
   npm run -w @kaia/frontend dev
   ```

Observação: Em desenvolvimento o frontend usa proxy do Vite para `/api` → `http://localhost:3060`.

### Banco (MySQL – Hostinger)
1. Crie um banco MySQL na Hostinger e anote host, porta, db, usuário e senha.
2. Copie o env e edite `DATABASE_URL`:
   ```powershell
   Copy-Item "apps\\server\\.env.example" "apps\\server\\.env"
   notepad.exe "apps\\server\\.env"
   ```
3. Gere o client Prisma e rode as migrações (local ou direto no Railway):
   ```powershell
   npm run -w @kaia/server prisma:gen
   npm run -w @kaia/server prisma:migrate
   ```

## Deploy (Visão Geral)
- Frontend: Vercel (build com `npm -w @kaia/frontend run build`).
- Backend: Railway (start com `node dist/index.js`).
- Banco: Hostinger (MySQL). Rode `npx prisma migrate deploy` no build ou primeiro start do servidor.

Sugestões de configuração:
- Vercel: configure a pasta do projeto como `apps/frontend` e a env `VITE_API_URL` apontando para a URL do backend no Railway.
- Railway: configure a pasta de serviço como `apps/server`, command de build `npm ci && npm run build` e start `npm start`. Defina `DATABASE_URL` nas variáveis de ambiente.

### Vercel (Frontend)
- Projeto apontando para `apps/frontend`.
- `vercel.json` já define `buildCommand` e `outputDirectory`.
- Variáveis: `VITE_API_URL=https://<railway-app>.up.railway.app`.

### Railway (Backend)
- Projeto apontando para `apps/server`.
- `Procfile` presente: `web: npm run start`.
- Build: `npm ci` → `npm run build` → `npm run prisma:gen`.
- Runtime: `DATABASE_URL` (Hostinger), `PORT` fornecido pelo Railway.
- Migrações em prod: `npx prisma migrate deploy` (adicione como step pós-deploy se desejar).

### Hostinger (MySQL)
- Crie o DB e obtenha `DATABASE_URL` com formato `mysql://USER:PASSWORD@HOST:PORT/DATABASE`.
- Use no Railway e em dev local (`apps/server/.env`).

## Modos
- Kaia - Código: envia comandos com confirmação para o agente local, mostra output em tempo real e responde com TTS.
- Kaia - Assistente: cria lembretes/agenda via API, confirma por voz e exibe timeline.

## Voz Personalizável (sem APIs pagas)
- No navegador (Windows/Edge/Chrome), a Kaia usa as vozes disponíveis do sistema via Web Speech API (SpeechSynthesis).
- Na tela "Voz da Kaia", escolha a voz pt-BR instalada (ex.: Microsoft Francisca, Maria, Antonio, etc.), ajuste velocidade e tom.
- Para instalar mais vozes no Windows: Configurações → Hora e idioma → Fala → Gerenciar vozes → Adicionar vozes (pt-BR).
- Alternativa offline (avançado): integrar Piper TTS (open-source) no backend. Podemos habilitar depois, mantendo local-first e sem tokens.

## Segurança
- O agente local só aceita conexões de `localhost` por padrão.
- O frontend pede confirmação antes de executar qualquer comando.
- Sem uso de APIs com cobrança por token por padrão. STT/TTS usam Web Speech API.
- Em produção, configure `CORS_ORIGIN` no servidor para o domínio do Vercel.

## Flags de Feature e Modelo (Preview)
- Endpoint: `GET /api/config` retorna `{ success, data: { features, defaultModel } }`.
- Flag: `GPT52_PREVIEW` (`true`/`false`). Se não definido, fica `true` em dev e `false` em prod.
- O frontend exibe um selo “GPT‑5.2 Preview ativo” quando habilitado.

## Agente Windows como serviço (opcional)
Para iniciar o agente automaticamente ao fazer logon no Windows:
```powershell
Set-Location "apps\agent-win\scripts"
./register-task.ps1
```
Para remover:
```powershell
./unregister-task.ps1
```
