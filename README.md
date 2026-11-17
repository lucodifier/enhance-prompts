# Prompt Enhancer

Transforma um pedido de uma linha em um prompt estruturado, pronto para colar na sua IA de código. Depois, gera a mensagem de commit e a descrição do Pull Request a partir do diff.

**Página do projeto:** https://lucodifier.github.io/enhance-prompts/

## O que faz

- **Prompt:** tarefa + Context Pack opcional viram um prompt em Markdown com cinco seções fixas (`Goal`, `Context`, `Constraints`, `Tasks`, `Acceptance criteria`). Modos `direct` (implementar já) e `two-phase` (descobrir, depois implementar).
- **Modo Caveman:** comprime o prompt removendo artigos e conectivos, mantendo nomes, caminhos e código exatos, para gastar menos tokens.
- **Commit:** cole o `git diff --staged` e receba uma linha no padrão Conventional Commits.
- **Pull Request:** cole o diff ou a lista de commits e receba a descrição seguindo o seu template.
- **Histórico:** salve pares pedido/prompt para reusar.
- **Modelos:** Groq (nuvem) ou Ollama (local), configurados por usuário e por fluxo.

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Vercel AI SDK, NextAuth (Google), PostgreSQL 16, Docker Compose.

## Rodar com Docker

### 1. Configurar o ambiente

```bash
cp .env.docker.example .env.docker
```

Preencha em `.env.docker`:

- `NEXTAUTH_SECRET`: gere com `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: crie um cliente OAuth no Google Cloud Console com o redirect URI `http://localhost:8080/api/auth/callback/google`
- `GROQ_API_KEY` (opcional) e/ou `OLLAMA_ENDPOINT`

Os arquivos `.env*` reais ficam fora do git. Só os modelos `.example` são versionados.

### 2. Subir

```bash
docker compose up -d --build
```

### 3. Criar as tabelas (somente na primeira vez)

```bash
for f in scripts/01-*.sql scripts/0[3-8]-*.sql; do
  docker compose exec -T db psql -U admin -d prompt_manager < "$f"
done
```

O script `scripts/02-enable-rls.sql` é só para Supabase (usa `auth.uid()`); não rode em Postgres comum.

### 4. Abrir

http://localhost:8080

## Rodar em modo desenvolvimento

```bash
cp .env.example .env      # preencha os valores
docker compose up -d db   # só o Postgres
pnpm install
pnpm dev                  # http://localhost:3000
```

## Ollama

- Rodando na mesma máquina, fora do Docker: `http://localhost:11434`
- App no Docker e Ollama no host: `http://host.docker.internal:11434`

Provedor, modelo e endpoint são ajustados em **Dashboard → Settings**. Com o modelo em `auto`, o app escolhe um entre os disponíveis.

## Entradas recomendadas

Mensagem de commit:

```bash
git add -A
git diff --staged
```

Descrição de PR:

```bash
git log --oneline origin/main..HEAD   # commits do branch
git diff origin/main...HEAD           # diff completo
```

## Licença

[MIT](LICENSE)
