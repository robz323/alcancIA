# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

This is **alcancIA**, a fork of ElizaOS (v0.25.6-alpha.1) — an AI agent framework. The main product is a conversational AI character ("Don Jaimito") that helps Spanish-speaking users with decentralized savings on Starknet. It runs as a backend Express server (port 3000) with an optional React web client (port 5173).

### Required runtime

- **Node.js 23.3.0** (pinned in `.nvmrc` and `engines`)
- **pnpm 9.15.0** (enforced via `preinstall` hook and `packageManager` field)

### Key commands

| Task | Command |
|---|---|
| Install deps | `pnpm install --no-frozen-lockfile` |
| Build all packages | `pnpm build` (runs turbo, excludes docs) |
| Lint | `pnpm lint` (Biome — pre-existing warnings are expected) |
| Run core tests | `cd packages/core && npx vitest run` |
| Start agent (backend) | `pnpm start --character characters/jaimito-dev.character.json` |
| Start web client | `pnpm start:client` (Vite dev server on port 5173) |
| Dev mode (all) | `pnpm dev` (builds first, then concurrently runs core, client-direct, client, agent) |

### Non-obvious caveats

1. **Turbo build order matters**: The first `pnpm build` may fail on `plugin-token-manager` because it depends on `plugin-tee` which hasn't been built yet. Running `pnpm build` a second time (or using `npx turbo run build --filter=!eliza-docs --continue`) resolves it by allowing cached builds from the first pass.

2. **Character file and Telegram**: The main character at `characters/jaimito.character.json` requires `TELEGRAM_BOT_TOKEN` because it has `"clients": ["telegram"]`. For local dev/testing without Telegram, use `characters/jaimito-dev.character.json` which has `"clients": []`.

3. **Model provider API key**: The DonJaimito character uses `"modelProvider": "anthropic"`, so `ANTHROPIC_API_KEY` must be set in the environment (or in `.env`) for LLM-powered responses to work. Without it, the server starts and accepts messages but cannot generate AI responses.

4. **Default character uses llama_local**: If you start the agent without specifying a character, it uses the built-in `defaultCharacter` which requires a local LLM (`llama_local`). Always specify a character file for cloud development.

5. **SQLite is the default DB**: No external database is needed. SQLite files are stored in `agent/data/db.sqlite`.

6. **The `.npmrc` has `frozen-lockfile=true`**: Use `--no-frozen-lockfile` flag when installing deps if the lockfile has drifted.

7. **Pre-existing lint warnings**: `pnpm lint` (Biome) reports ~2800+ warnings and 1 error. These are pre-existing and not blocking.

8. **Core test: 1 failure on fastembed**: The `embedding.test.ts` test in `packages/core` fails due to a missing native `fastembed` module. All other 20 test files (186 tests) pass.
