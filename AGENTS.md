# Lockhouse — agent instructions

Lockhouse: a family house for papers, locked in the browser with QoreSeal (ML-KEM-1024 + X25519), padlocks registered on QoreChain's Diana testnet, family drop-ins signed with QoreSign. Built for QoreChain's Build Before Q-Day hackathon. Workflow: `HACKATHON-WORKFLOW-V16.md` (local only, not in the repo).

## Docs

- [PROGRESS.md](PROGRESS.md) — where we are; read it first.
- [docs/PLAN.md](docs/PLAN.md) — golden path (§1), later build units, decisions log.
- [docs/DESIGN.md](docs/DESIGN.md) — stories, page flow, screen inventory, design direction.
- docs/TESTS.md — test plan (from P5).
- `internal/` — private notes, never committed (the idea, the facts, AI usage notes).

## Stack

Next.js (App Router) + TypeScript + Tailwind · BFF in Route Handlers / Server Actions · Supabase Postgres (locked copies + house membership; no Supabase Auth) · Vercel · Vitest · `@qorechain/qoreseal`, `@qorechain/qoresign`. No smart contract.

- Network: testnet `qorechain-diana` (REST https://api-testnet.qore.host, RPC https://rpc-testnet.qore.host). Never mainnet.
- Supabase org `ervhint` · Staging `egtxrdfhmtdiujdiywkm` (default) · Prod `htghbmdautdpgzalysko` (P7 only, with Laras's yes).
- Vercel team `ervhint`, project `lockhouse-qorechain` (no deploy until P7).
- Repo https://github.com/ervhint/lockhouse (public).

## Commands

- `npm run dev` — dev server on http://localhost:3000 (verified 23 Nov; P3 samples at `/samples`).
- `npm test` — not set up yet (P6).

## Rules

- **Simplest code (`ponytail`).** Use it for the samples, the prototype, every unit and every fix: the simplest solution that works, with no extras nobody asked for. It cuts bloat, never tests, security or acceptance criteria. Load `ponytail` with the Skill tool before writing any code in a chat.
- **Claude in Chrome for all browser work.** Research, reading docs, localhost previews, screenshots, design reviews, console/network debugging, testing, Vercel checks. Never the built-in browser pane (`mcp__Claude_Browser__*`, `preview_start`) or Playwright. It is Laras's real Chrome with real logins: during research only look; never sign in, submit forms or change anything. If Chrome isn't connected, say so and ask before using anything else.
- **Write simply.** Answer first, then only the details needed. Short sentences, everyday words, one idea per sentence. Explain a technical term in a few words the first time. Keep file names, commands and code exact. For a fix, plan or choice: what's wrong, what you'll change, a small example of the result. If Laras doesn't understand, explain again in simpler words. Web3 ideas (wallets, signatures, gas, testnets, transaction states) get a short everyday example the first time and whenever asked, e.g. "A gas fee is like a delivery fee: you pay the network a small amount to process your transaction."
- **One shared component per job.** From P4a on: one button, one input, one modal/sheet, one toast, one empty state, and so on, each listed below with its path. Before making any UI piece, check the list and search the code. If one almost fits, add a prop; never write a second version. Add every new shared component to the list in the same chat. Only exception: the P3 samples (P4a deletes the unpicked ones).
- **Load the skills for the work** (list below). Naming a skill doesn't load it: call the Skill tool with its name before that work, in every chat. Plugin skills use their full name with the plugin prefix (e.g. `figma:figma-use-figjam`). Before saying a skill is missing, look on disk: `~/.claude/skills/<name>/SKILL.md` for own skills, `~/.claude/plugins/cache/` for plugin skills. A skill can be installed but left out of the skill list; if it's on disk, load it with the Skill tool or ask Laras to type `/<name>`. Only if it's not on disk, say so in one line and use the fallback.
- **Commits.** Laras approves every commit and push: show files, message and branch, wait for a yes, stage only those files. Scan staged changes for secrets and keep the `gitleaks` pre-commit hook passing; never `--no-verify`. Commit as Laras's own git identity. Never add `Co-Authored-By` or "Generated with Claude Code" lines.
- **Never:** secrets outside gitignored `.env*`; touch `hackathon\qorechain.txt`; mainnet or real funds; writes to Supabase Prod outside P7.
- **Values are `{placeholders}`, never made up (Laras, 23 Nov, for P4 on).** In every page, mock and prototype, anything that changes per person, item or moment is written as a placeholder in curly braces: `Welcome, {username}`, `From {senderName} · Signature Checked`, `{readerCount} Readers`, `{date}`, `{qorAddress}`. Never invent a name, number, date or amount to fill a slot. Fixed text (labels, buttons, headings, sentences) is written out. Only true, fixed facts may appear as plain text (e.g. "ML-KEM-1024").
- **General words in the writing; examples stay examples.** Landing and explainer text speaks in general ("your family", "the people you pick", "important papers"). Never turn the plan's examples into the copy: not "Ayu, Tari and Ratna" (example people), not "KK and KTP" (example papers) (Laras, 23 Nov). Where the app shows a person, the screen shows their name as a value (`{memberName}` in mocks; the real name at runtime), never a role word like "Me", "Sister" or "Mom". Ayu, Tari and Ratna are only the people in the demo recording and the test seeds. See docs/DESIGN.md "Names".
- **Title Case** for UI labels (headings, buttons, nav, tabs, form labels, table headers, short statuses), written in the text, not with CSS. Sentences stay sentence case.
- **Dev server:** reuse a running localhost; never stop or restart it without Laras's yes.

## Skills

- All code, every phase: `ponytail`.
- Every UI change, from P4 on: `better-interface`. Check the change with it before saying it's done; fix what it finds, but ask first if a fix changes the approved look.
- P1 Idea: `grilling`, `domain-modeling`.
- P2 Stories + flow: `figma:figma-use-figjam`, `figma:figma-generate-diagram`.
- P3 Samples, P4 All pages: `frontend-design:frontend-design`.
- P5 Plan: `to-tickets`.
- P6 Build: `tdd`, `codebase-design` (once, for the architecture), `clean-code`, `supabase:supabase`, `supabase:supabase-postgres-best-practices`; `/simplify` if code feels bloated.
- P7 Test + ship: `/code-review`, `/security-review`.

## Shared components

*(empty until P4a: name · path · one line on use)*

## Agent skills

### Issue tracker

Local Markdown, no external tracker (build units live in `docs/PLAN.md` §4). See `docs/agents/issue-tracker.md`.

### Domain docs

Single-context: one `GLOSSARY.md` + `docs/adr/` at the repo root, made only when needed. See `docs/agents/domain.md`.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
