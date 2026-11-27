# Lockhouse — agent instructions

Lockhouse: a family house for papers, locked in the browser with QoreSeal (ML-KEM-1024 + X25519), padlocks registered on QoreChain's Diana testnet, family drop-ins signed with QoreSign. Built for QoreChain's Build Before Q-Day hackathon. Workflow: `HACKATHON-WORKFLOW-V16.md` (local only, not in the repo).

## Docs

- [PROGRESS.md](PROGRESS.md) — where we are; read it first.
- [docs/PLAN.md](docs/PLAN.md) — golden path (§1), later build units, decisions log.
- [docs/DESIGN.md](docs/DESIGN.md) — stories, page flow, screen inventory, design direction.
- [docs/TESTS.md](docs/TESTS.md) — test plan and results (IDs match the acceptance criteria in PLAN §4).
- `internal/` — private notes, never committed (the idea, the facts, AI usage notes).

## Stack

Next.js (App Router) + TypeScript + Tailwind · BFF in Route Handlers / Server Actions · Supabase Postgres (locked copies + house membership; no Supabase Auth) · Vercel · Vitest · `@qorechain/qoreseal`, `@qorechain/qoresign`. No smart contract.

- Network: testnet `qorechain-diana` (REST https://api-testnet.qore.host, RPC https://rpc-testnet.qore.host). Never mainnet.
- Supabase org `ervhint` · Staging `egtxrdfhmtdiujdiywkm` (default) · Prod `htghbmdautdpgzalysko` (P7 only, with Laras's yes).
- Vercel team `ervhint`, project `lockhouse-qorechain` (no deploy until P7).
- Repo https://github.com/ervhint/lockhouse (public).

## Commands

- `npm run dev` — dev server on http://localhost:3000 (verified 23 Nov; P3 samples at `/samples`).
- `npm test` — Vitest on localhost (unit + later integration against Staging and the testnet). Reads `.env.local`.
- `npm run test:accounts` — makes `TEST_MNEMONIC_1..3`, `SESSION_SECRET` and `SUPABASE_URL` in `.env.local` if missing, prints the 3 qor1 addresses to fund at the faucet.
- `npm run build && npm run check:build` — build, then check no server secret is in `.next/static` (T-0.5).
- CI: `.github/workflows/test.yml`, one job on pushes to `main` (npm ci, test, build, check). Needs repo secrets named in `.env.example`.

## Architecture (U0, details in docs/PLAN.md §3)

- `lib/settings.ts` is the only place for chain id, REST, RPC, explorer, faucet and the item purpose. Testnet only; no env var can change it.
- Browser: keys made from the 24 secret words (QoreSeal, QoreSign); words stay in localStorage. Server routes (`app/api/*`) only hold locked copies, signed cards and houses, through the Supabase service role key (RLS on, no policies).
- Chain calls from the browser go through `/api/chain/[...path]` (fixed path list, U2). Routes and tables: PLAN §3.3 and §3.2.
- Session (U3): `lib/session.ts` signs cookies (`seal`/`unseal`); member pages call `await signedIn()`, member API routes check `unseal(SESSION, …)` and answer 401. Supabase: `lib/db.ts` (service role, server only); migrations in `supabase/migrations/`, applied to Staging by hand.
- Env vars (names in `.env.example`): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (server only, no `NEXT_PUBLIC_`), `TEST_MNEMONIC_1..3` (tests only).
- Tests live in `tests/*.test.ts`. QoreSeal errors carry `.code` (e.g. `NOT_A_RECIPIENT`), not the code in the message.

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

- Button · `components/Button.tsx` · the one button (primary/secondary/ghost/danger, `loading`, `href` makes it a link, `newTab` for other sites; `aria-label` works on both). Minimum height, so a label that wraps on a phone gets room (override with `min-h-…!`)
- Input · `components/Input.tsx` · text field, textarea (`multiline`), dropdown (`options`) and file field with label, hint, error
- Checkbox · `components/Checkbox.tsx` · checkbox row (reader picker, confirmations); `radio` makes it a radio row (File or Note on Put In)
- Panel · `components/Panel.tsx` · the one card surface
- Badge · `components/Badge.tsx` · status pill (ok/warn/bad/wait, each with an icon); `href` makes it a link to another site (explorer), with an external-link icon
- TxPill · `components/TxPill.tsx` · transaction status (waiting/pending/confirmed/failed), built on Badge
- AddressChip · `components/AddressChip.tsx` · short qor1 address or tx hash (long values cut to start…end), optional explorer link (`href`) or copy button (`copy`)
- Sheet · `components/Sheet.tsx` · the one modal (closes by link or Esc; focus moves in and Tab stays inside)
- Toast · `components/Toast.tsx` · the one toast (× closes it)
- EmptyState · `components/EmptyState.tsx` · icon, title, text, action; `page` (it is the whole page) puts it on the Panel card with an h1 title, `warn` a red icon
- Skeleton · `components/Skeleton.tsx` · loading placeholder
- Heading · `components/Heading.tsx` · page title + one sentence; the h1 takes focus from script (`tabIndex=-1`) for views that change in place
- PaperView · `components/PaperView.tsx` · an opened paper: signature badge, preview (blurred when not proven), Download, a back action (Item page and Open With Recovery Words)
- Words · `components/Words.tsx` · 24 secret words in a numbered grid (S-03 backup, recovery key); `copy` adds Copy All Words (S-03 only)
- AppShell · `components/AppShell.tsx` · header, night background; `signedIn` shows the nav (House · Members · Papers) + UserMenu; the Drill passes `signedIn={false}` so it always shows the stranger's header
- UserMenu · `components/UserMenu.tsx` · signed-in menu: name from this browser, Sign Out, Forget Keys; no keys → Welcome (AC-3.7); exports `signOut()`
- Logo · `components/Logo.tsx` · the sun-ray mark
- Hero · `components/Hero.tsx` (+ `hero.css`) · Welcome screen from sample 02 (fog, Today / After Q-Day switch); the only link to the Drill (Play the Thief, `.cta.alt` outline button)
- PaperList, NoPapers, PutInButton · `app/house/HouseView.tsx` · the one paper row (title · sender + date · readers · Stamped badge), used by House and Papers; the member row is in the same file (House and Members)

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
