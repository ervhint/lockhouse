# PROGRESS
Hackathon: QoreChain Build Before Q-Day · Deadline: 2026-12-03 06:59 WIB (Laras's target: build done end of 2026-11-26) · Track: web3 (Diana testnet, no contract)
Workflow: HACKATHON-WORKFLOW-V15.md (from 2026-11-23, lockhouse-02; same phases and gates as V14, full plugin skill names, look on disk before calling a skill missing)
Phase: P3 Samples in code (not started; new chat lockhouse-03, Sonnet 5.5 · medium) · Last gate passed: G2 (2026-11-23, Laras: "ok, continue") · Waiting for user: **design references for P3**
Golden path: docs/PLAN.md §1.2     App: localhost until P7
Accounts: GitHub https://github.com/ervhint/lockhouse (public, empty, created 2026-11-23) · Supabase org `ervhint` · Staging ref `egtxrdfhmtdiujdiywkm` · Prod ref `htghbmdautdpgzalysko` (untouched until P7) · Vercel team `ervhint`, project `lockhouse-qorechain` (created 2026-11-23, no deploy until P7)
Could, if time allows: recovery key (Laras, 2026-11-23).
Laras (23 Nov): P2 starts in a new chat, after P1 is clear.

| Build phase | Unit | Status | Tests | Notes |
| --- | --- | --- | --- | --- |
| — | — | — | — | units come in P5 |

Done 2026-11-23: copied the four qorechain files into internal/ and HACKATHON-WORKFLOW-V14.md here; saved handoff §5–6 to memory; checked QoreSeal/QoreSign run in a browser (docs/PLAN.md §1.5); wrote docs/PLAN.md §1.
Done 2026-11-23 (lockhouse-02): AGENTS.md + CLAUDE.md written (git, .gitignore and the gitleaks hook were already set up); FigJam board with 19 stories and the page flow; docs/DESIGN.md (stories table, 10 screens, states). `/setup-matt-pocock-skills` run by hand (it can only be started by Laras, so it was missed at first): local Markdown tracker, single-context glossary, no triage labels (triage skill not installed); docs/agents/ + "Agent skills" block in AGENTS.md.
Committed and pushed 2026-11-23 (Laras's yes): .gitignore, PROGRESS.md, AGENTS.md, CLAUDE.md, docs/PLAN.md, docs/DESIGN.md, docs/agents/ ("Add P2 stories, page flow and project setup").
Decisions: docs/PLAN.md §5 (from P5) · Design: docs/DESIGN.md (stories, screen inventory, FigJam https://www.figma.com/board/YJ3XAssAtb5I5KtXeFSX77)
Blockers: none
Next action: P3 in a new chat lockhouse-03 (Sonnet 5.5 · medium): Laras sends design references; build each one exactly at /samples/01–03 on localhost (no deploy), then swap in our content. Every sample works at 1440px and 375px (phones are demo devices) and shows people by name: Ayu, Tari, Ratna (never "Me/Sister/Mom"). Laras edits the project page line "next to each Lockhouse copy sits an old-lock copy" herself (only the drill's sample KTP has one).
Earlier (P1, 2026-11-23): P2 Stories + page flow in a new chat (Opus 5.5 · medium): git init + .gitignore + AGENTS.md/CLAUDE.md first (workflow §13), then the FigJam stories and page flow (settle the demo windows, PLAN §1.5). Project page (2026-11-23, done with Laras's yes): Apache-2.0 LICENSE committed and pushed (`7e52397`, main; gitleaks hook works, no leaks); repo linked on the project page (My space: "1 counted of 1" commits); QoreChain Build GitHub App installed on ervhint/lockhouse only (read-only); AI-Native ticked and Regional set to Indonesia (they had not been saved before). The site says AI-Native needs AI_USAGE.md in the repo (expected, add before the deadline). git is set up locally (remote origin, .gitignore, pre-commit hook); .gitignore, PROGRESS.md and docs/ are not committed yet.
