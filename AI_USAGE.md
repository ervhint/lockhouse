# How AI was used to build Lockhouse

Lockhouse was built by one person ([ervhint](https://github.com/ervhint)) with **Claude Code** (Anthropic), from 22 to 26 Nov 2026. The AI wrote almost all of the code, tests and docs. The person decided what to build, what it should feel like, and approved every step before it moved on. This file says who did what, and how the AI's work was checked.

## The workflow

A written hackathon workflow (kept outside the repo) split the work into seven phases, each ending at a **gate** the person had to pass by saying yes:

| Phase | What happened | Gate |
| --- | --- | --- |
| P1 Idea | Many rounds of questions ("grilling") between the person and Claude to find and sharpen the idea; novelty checks against the other fest projects | G1 idea locked |
| P2 Stories + flow | 19 user stories and the page flow on a FigJam board (Figma MCP), [docs/DESIGN.md](docs/DESIGN.md) | G2 |
| P3 Samples | 10 look-and-feel samples built from the person's own design references; the person picked one | G3 |
| P4 Pages | Every screen with `{placeholders}` for values, shared components | G4 |
| P5 Plan | Build units U0–U10 with acceptance criteria and test ids ([docs/PLAN.md](docs/PLAN.md)), test plan ([docs/TESTS.md](docs/TESTS.md)) | G5 |
| P6 Build | One unit per chat, tests first, each unit committed only after the person said yes | per commit |
| P7 Test + ship | Code review, security pass, full browser run, these write-ups, then deploy | G6, G7 |

Every phase started in a new chat with a written handoff ([PROGRESS.md](PROGRESS.md)), and the model was picked per unit (Opus 5.5 for hard parts like keys, sign-in and the drill; Sonnet 5.5 for well-scoped parts). [AGENTS.md](AGENTS.md) holds the standing rules the AI followed in every chat.

## What the AI did

- **Code:** the whole Next.js app: key handling, padlock registration on the testnet, Sign In With QoreChain, the house, locking and signing papers, opening and checking them, the Q-Day Drill, removing members, the recovery key and, added in P7, a stamp on QoreChain for every paper. Plus the database migrations.
- **Tests:** 44 Vitest tests (unit tests and integration tests against the real testnet and a Staging database), the GitHub Actions job, and a script that checks no server secret ends up in the browser files.
- **Research:** read the QoreSeal and QoreSign kits' type files and testnet examples before planning, instead of guessing their APIs. That found two things that shaped the plan: sign-in needs the padlock registered first, and QoreSeal has no "old lock only" mode, so the drill needed its own small old lock.
- **Docs:** the plan, test plan, design notes, stories, this file and the README.
- **Browser testing:** Claude in Chrome, in four Chrome profiles at once (three family members and a Thief with no keys), on localhost.
- **Reviews:** design reviews of each screen (accessibility, layout, writing, type, colour, polish) with contrast measured on the real background picture; `/code-review` and a security pass in P7.

## What the person decided

- **The idea and its heart:** a family house for important papers; the rule "this is a house, not everyone can enter"; the name Lockhouse and the tagline; "protect my peace" as the point; the drill as the 30-second moment; that it is about the whole family, not two people.
- **Scope:** the golden path, what is a Must and what is a Could (the recovery key, removing members, the fake drop-in), 2 MB as the limit, titles hidden from the public store, the sender always a reader. In P7 the person added one more unit, the stamp on QoreChain, picked from three options the AI offered, and chose that nothing is saved if the stamp fails.
- **The look:** picked sample 02 out of 10; approved every change to the approved look (for example brighter warning colours when contrast failed, a card behind whole-page messages); asked for "A File or A Note" on Put In.
- **Rules for the AI:** values on screens are always `{placeholders}`, never made-up names or numbers; public copy stays general (no example people or example papers); simplest code first; Chrome only for browser work; plain words.
- **Every commit and push**, after seeing the files and the message. Every write to a live database. Funding the test accounts at the faucet, adding repository secrets, and signing in to outside services were done by the person.

## How the AI's work was checked

- Tests first for each unit, then the full suite before each commit (44/44 after the last unit), and the same suite on GitHub Actions after each push.
- Each unit's acceptance criteria were run in the browser and written into [docs/TESTS.md](docs/TESTS.md) with evidence (timings, network requests, screenshots).
- A secret scanner (gitleaks) runs before every commit; the build check searches the browser files for server secrets.
- In P7: a code review and a security pass over every route, migration and screen, then the whole golden path again in four Chrome profiles and every page at phone width.

## Mistakes the AI made (and how they were caught)

Kept honest, because they show where checking mattered:

- Moving the generated FigJam diagram into a section broke its arrows. The AI saw it and regenerated it.
- The first app setup reloaded pages in a loop. Fixed by copying the setup of the person's other working project.
- A test file briefly moved a test account while another test used it, so one run failed. The tests now run one file at a time.
- Several screen bugs found in the AI's own design reviews: focus lost after an action, a shared button dropping its accessible name when used as a link, a badge stretching to full width, text that failed contrast on the background picture.
- The database tool refused some migrations; the person ran them by hand in the Supabase SQL editor.
- In P7, the security pass found that opened SVG pictures were shown in a way that could let a crafted picture run code on the site. It was fixed before deploy.
- During the person's smoke test, the AI removed a button from the House page as part of an option the person had not picked yet. The person asked why it was gone, and it was put back.

## Tools

Claude Code (desktop app) with Claude Opus 5.5 and Sonnet 5.5 · Claude in Chrome · Figma MCP (FigJam) · Supabase MCP · skills for simple code, test-driven development, design review and grilling · GitHub CLI.
