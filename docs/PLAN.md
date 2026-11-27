# Lockhouse: plan

*§1 written 23 Nov 2026 (P1, chat lockhouse-01). The idea is Laras's and is final: [internal/qorechain-2026-final-idea.md](../internal/qorechain-2026-final-idea.md). This file only adds what the build needs. §2–§6 written 23 Nov 2026 (P5), after reading both kits' type files and their testnet examples.*

## 1. Context and golden path

### 1.1 Problem, user, differentiator (short; full text in the final idea file)

- **Problem:** KTP and KK photos sit in chats, galleries and cloud backups, where anyone with a copy can read them. Copies locked the old way open after Q-Day.
- **User:** you and the people in your house (your family, or anyone you trust). Demo accounts: three family members with made-up names, **Ayu** ("Me", the house owner), **Tari** (her sister) and **Ratna** (their mom), plus a **Thief**. The app always shows each person's own name, never "Me", "Sister" or "Mom" (see [DESIGN.md](DESIGN.md) "Names").
- **The rule:** "This is a house, not everyone can enter."
- **Differentiator:** a family house where sharing uses the new padlock (ML-KEM-1024 via QoreSeal), each person's keys stay on their own device, the padlocks sit in QoreChain's public phone book, and what family members put in for each other is signed (QoreSign). Closest outside: Ente Locker (old padlock), Qpher Vault (company keeps the keys). None of 133 fest projects is a family house.

### 1.2 Golden path (the 60–90-second demo)

Before recording: the three family accounts are set up (padlocks registered on testnet, signed cards published) and the Thief window is open. All papers are made-up samples.

1. **Ayu's house.** Ayu's window shows the house (the Members box on House; the full list on Members): Ayu, Tari and Ratna, each with a "Padlock in the Phone Book ✓" badge that links to the registration on the testnet explorer.
2. **The gate.** Ayu drops in the sample family KK and ticks Tari and Ratna. The screen shows it being locked in this browser ("Locked on This Device · ML-KEM-1024 + X25519 · 3 readers") before it's sent, then stamped on QoreChain (U11). Only the locked copy is stored.
3. **Tari opens it.** In Tari's window the KK appears, "Put in by Ayu". Tari opens it; it unlocks in her browser, with "Stamped on QoreChain · {date}" (U11).
4. **Ratna opens the same lock.** In Ratna's window the same single locked copy opens too (one lock, many readers).
5. **Ratna puts something in for Ayu.** Ratna puts in a private note for Ayu. It's locked to Ayu's padlock and signed. In Ayu's window it shows "Signature Checked on QoreChain ✓", with Ratna's name under the title.
6. **The drill (labelled "Simulation").** The Thief window opens the Drill from Welcome (Play the Thief) and plays three steps: Break In and Steal Everything (every stored copy is downloaded: the store is public), Try to Open Them (each copy really refuses: 0 opened), It's Q-Day: Try Again (the old lock is broken, which is the pretend part; every copy still carries ML-KEM-1024). It ends "You stole {n} papers. You opened 0." (D-19)
7. **The family is still fine.** Back in Tari's window, the KK still opens. End card: the tagline.

Steps 2–6 are each about 10–15 seconds. The account setup (making keys, registering the padlock) is shown in the longer video, not in these 90 seconds.

### 1.3 How it meets the score

| Part (weight) | Golden-path step |
| --- | --- |
| Works as described (25%) | Every step runs on testnet; only the Thief's power in step 6 is pretend, and it says so |
| QoreChain tech usage (25%) | Step 1 (PQC key + KEM key registration, signed cards), step 2 (QoreSeal in the browser; a hybrid ML-DSA-87 stamp transaction per paper, U11), step 3 (the stamp checked with QoreSign's `inspectTransaction`), step 5 (QoreSign checked against chain) |
| Post-quantum correctness (20%) | Step 6: the old lock breaks, the hybrid lock holds because of ML-KEM-1024; honest limits in the README |
| Originality (15%) | The family house itself (steps 1, 3–5) |
| Clarity, UX, docs (15%) | One gate, one list, one drill; the README limits |
| Best AI-Native Build ($500) | `AI_USAGE.md` from the notes in `internal/ai-usage-notes.md` |

### 1.4 Scope (MoSCoW)

| | What |
| --- | --- |
| **Must** | Sign in with your QoreChain key (Sign In With QoreChain, so only you can add to your house) · add a family member by their qor1 address (their signed card is checked first) · make your keys in the browser from secret words (shown once as the backup) · register the padlock: ML-DSA-87 key with proof of possession, then `MsgRegisterKEMKey`, plus the signed card · the house list (members, their badges) · the gate: lock in the browser for chosen members, store only the locked copy · the house's item list · open in the browser · a family member's signed drop-in, checked against the chain · the drill (the Thief steals every copy, Q-Day, 0 opened; labelled "Simulation") |
| **Should** | A photo size limit with a clear message · explorer links on every on-chain step |
| **Could** | Being in several houses (a house picker) · a recovery key · a fake "from Ratna" drop-in being refused on screen · remove a member · group keys that stop a removed member reading new items |
| **Won't** | Mainnet · an app to install · offline/Bluetooth · messaging · "after I'm gone" · the QoreX wallet as the key holder (it can't give the house its lock keys; see 1.5) |

### 1.5 Technical answers found in P1 (checked 23 Nov)

- **QoreSeal works in the browser.** `@qorechain/qoreseal` 0.1.0 and `@qorechain/qoresign` 0.2.0 are pure JavaScript (noble/scure libraries, no Node-only imports). Both have everything the build needs: `seal`/`open`, `deriveSealKeys`, `buildRegisterKemKeyMessage`, `signRecipientCard`/`verifyRecipientCard`, `buildRegisterPqKeyMessage`, `signProofOfPossession`, `signHybrid`, `broadcastTx`, `signMessage`, `verifyMessageWithChain`, `signSiwq`/`verifySiwqWithChain`.
- **Keys live in the browser.** Each person's secret words are made in their browser and kept there; the words are the backup and the way onto a new device. The keys never reach our server. QoreX can't be the key holder, because the house needs lock keys made from the secret words and a wallet doesn't hand those out.
- **Gas:** each family account needs test QOR for its two registrations (faucet: 100 per 24 h). The Thief needs none.
- **Where locked copies go:** a hosted database that only ever holds locked copies (Supabase), reached through our own server routes. Not on chain: a KTP photo is about 150–500 KB, too big for a transaction.
- **Size:** a locked copy is the file + 56 + 1,664 bytes per reader (3 readers ≈ 5 KB extra).
- **The drill:** the Thief steals every stored copy and tries to open each with QoreSeal (all refuse). Q-Day, the old lock (X25519) breaking, is pretend: no one can break it today, and real members' old keys never leave their devices. Each copy is then read to show it still carries ML-KEM-1024, which a quantum computer can't break (D-19; T-0.3 proves the old key alone doesn't open a copy).
- **Demo windows:** settled at G2 (see [DESIGN.md](DESIGN.md) "G2 answers"): Ayu and Tari on phones, Ratna and the Thief on the PC in two browsers. Build and test with four Chrome profiles.

### 1.6 Open questions

1. ~~Accounts~~ Settled 23 Nov: GitHub https://github.com/ervhint/lockhouse (public, empty, created 23 Nov) · Supabase org `ervhint`, Staging `egtxrdfhmtdiujdiywkm`, Prod `htghbmdautdpgzalysko` · Vercel team `ervhint`, project `lockhouse-qorechain` (created 23 Nov, no deploy yet; lockhouse-qorechain.vercel.app was free on 23 Nov and is claimed at the first production deploy in P7).
2. ~~Recovery key~~ Settled 23 Nov: **Could** (Laras: "if we have time, we might build it"). Until then the secret words are the backup, and the README says so.
3. ~~Fest feed and the repo~~ Settled 23 Nov: the repo is public and linked, the QoreChain Build app is installed, and the first commit is counted. AI-Native and Regional Indonesia are saved on the project page.
4. Keep checking until the deadline: the drill's attack log, look-alike projects, rule changes.

### 1.7 Stack

Next.js (App Router) + TypeScript + Tailwind · our own server routes for the store (rule 13) · Supabase Postgres for locked copies and house membership (no Supabase Auth: you sign in with your QoreChain key) · Vercel · Vitest · `@qorechain/qoreseal`, `@qorechain/qoresign` (both counted as kits on the project page). No smart contract, so no Foundry and no `test` branch.

## 2. Non-functional (measurable)

| ID | Rule | How it's checked |
| --- | --- | --- |
| NF-1 | Every screen works at 375px (phones) and 1440px, with no sideways scroll | Chrome at both widths, every page state (TESTS.md "Page states") |
| NF-2 | Secret words, secret keys, files and notes never leave the browser (since D-19 with no exception: the drill no longer takes anyone's old key) | Network tab on each golden-path step; route tests refuse unknown fields |
| NF-3 | Only the testnet: chain id `qorechain-diana`, REST https://api-testnet.qore.host. No setting can point the app at mainnet | One constant in one settings module; the chain pass-through only knows the testnet host |
| NF-4 | A file can be up to **2 MB** (a phone photo of a paper fits; Vercel accepts 4.5 MB per request, and the locked copy is sent as text, about 1.35× bigger) | U5 too-big test |
| NF-5 | On the PC: locking 500 KB for 3 readers takes under 2 s, and opening it under 2 s (chain checks not counted) | Timed in Chrome in U5 and U6 |
| NF-6 | A testnet transaction shows Pending at once and Confirmed or Failed within 60 s | U2 |
| NF-7 | Server secrets (`SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`) never reach the browser; no `NEXT_PUBLIC_` variables are needed | Search the built browser files in U0 |
| NF-8 | RLS is on for every table, with no policies for `anon` or `authenticated`: only our server routes (service role) read or write | Supabase advisors in U0 and U4 |
| NF-9 | Keyboard works on every screen, focus is visible, text contrast is AA | `better-interface` on each unit |
| NF-10 | Every error says what happened and what to do next (no bare "Something went wrong") | Each unit's error states |

## 3. Data, routes and keys

### 3.1 What is stored where

| Where | What | Who can read it |
| --- | --- | --- |
| **The browser** (localStorage, this device only) | Your secret words and your name. Every key is made again from the words when needed: the classical key and qor1 address, the ML-DSA-87 signing key, the QoreSeal keys (ML-KEM-1024 + X25519) | Only this browser |
| **QoreChain testnet** (the public phone book) | Your ML-DSA-87 signing key (with its proof) and your ML-KEM-1024 padlock | Everyone |
| **Supabase Staging** (through our server only) | Names, signed cards, houses, members, locked copies, signatures | Only our server routes |

### 3.2 Tables (Supabase Postgres)

```mermaid
erDiagram
  people ||--o| house_members : "is in one"
  houses ||--|{ house_members : has
  houses ||--o{ items : holds
  people ||--o{ items : "puts in"
  people {
    text address PK "qor1..."
    text name
    jsonb card "QoreSeal recipient card, checked against the chain before saving"
    timestamptz created_at
  }
  houses {
    uuid id PK
    text owner FK "people.address"
    jsonb recovery "U10: recovery key's public half, who made it, their signature"
    text recovery_lookup "U10: SHA-256 only the recovery words give; unique"
    timestamptz created_at
  }
  house_members {
    text address PK "one house per person (Must)"
    uuid house_id FK
    text added_by FK
    timestamptz added_at
  }
  items {
    uuid id PK "made in the browser; also the envelope's AAD"
    uuid house_id FK
    text sender FK
    text title "seen by house members only"
    text envelope "QoreSeal envelope as text (qoreseal:...)"
    jsonb signature "QoreSign message signature"
    text_array readers "qor1 addresses"
    int size
    text recovery "U10: the lookup, when the recovery key is a reader"
    text stamp "U11: hash of the stamp transaction on QoreChain; null = not stamped"
    timestamptz created_at
  }
```

One migration file per unit that adds tables (U3: people, houses, house_members · U5: items · U7: drill_keys, dropped again on 27 Nov by `20261127000000_drill_own_keys.sql` (D-19) · U10: recovery columns · U11: items.stamp), applied to **Staging** `egtxrdfhmtdiujdiywkm` only.

### 3.3 Server routes (the BFF)

| Route | Who | Does |
| --- | --- | --- |
| `GET/POST /api/chain/[...path]` | anyone | Pass-through to the testnet REST, only for the paths the kits use (account info, balances, PQ key, KEM key, simulate, broadcast, tx lookup; U11 adds tx encode, which `inspectTransaction` uses to get a committed transaction's bytes). The kits take a `rest` address, so the browser gives them `/api/chain` (D-03) |
| `GET /api/auth/nonce` · `POST /api/auth/verify` · `POST /api/auth/sign-out` | anyone | Sign In With QoreChain (U3) |
| `GET /api/house` · `POST /api/house/members` | house members | House, members, item list; add a member (U4, U5) |
| `GET /api/items?from=N&q=&by=` | house members | The Papers page: 10 papers at a time, newest first, with the count; `q` finds words in the title (3 characters or more, any case, matched as text), `by` keeps one sender (D-18) |
| `POST /api/items` · `GET /api/items/[id]` | house members | Put in; get one item for a reader (U5, U6). U11: a put-in may carry its stamp (a tx hash), stored only if it checks out on chain; readers get it back |
| `GET /api/drill` | anyone | Every stored copy (`id, envelope, date`), with no title, names or readers: the Thief's loot (U7, D-19). Replaces the planned `/api/copies`. `POST /api/drill` (give my old keys) was removed on 27 Nov |
| `POST /api/house/recovery` | members | Give the house its recovery key (U10): the public half and a lookup, signed by me and checked on chain. Once per house (409 after) |
| `POST /api/recover` | anyone | Open With Recovery Words (U10): the lookup made from the words finds the papers locked to that key (copy, title, sender); 404 if none. No sign-in |
| `POST /api/drill/fake` | members | Try a Fake Drop-In (U8, Simulation): plays a hacked server. Locks a made-up note to me, signs it with a throwaway key and stores it as if another member of my house sent it. Opening it shows Signature Not Proven. Since 27 Nov no page has its button (no drill on the family side); it stays to make a fake paper for the video, and for T-8.1 |

### 3.4 Env vars

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET` (server only) · `TEST_MNEMONIC_1`, `TEST_MNEMONIC_2`, `TEST_MNEMONIC_3` (throwaway testnet accounts, tests only). All in the gitignored `.env.local`; names only in `.env.example`. The chain id, REST address, explorer and faucet links are fixed facts, written once in code, not env vars.

### 3.5 Web3: money, powers, rules that always hold, transaction states

**Asset flows.** The only money that moves is test QOR for gas: each family account pays the network a small fee (about 0.04 test QOR per registration at 0.1 uqor per gas) for its own two registrations. Test QOR comes from the faucet (100 per 24 h). No contract, no transfers between people, no tokens. U11: each paper put in costs its sender one more small fee (the stamp: 1 uqor sent to themselves, plus gas). The Thief and the server hold no QOR.

**Permissions.** No admin and no contract. The person who starts a house is its owner; any member can add someone (G2). Any member can remove another member, not themselves (U9; kept by Laras on 27 Nov, D-20); the removed person gets an empty house of their own. The server can't open any paper or forge a signature. It *could* hide or delete a locked copy, or refuse to store one; that is in the README limits.

**Invariants (must always hold):**
- INV-1: the server never receives secret words, an ML-KEM-1024 secret key, an ML-DSA-87 secret key, an X25519 secret key, a file or a note.
- INV-2: every stored item's signature checks out against its sender's ML-DSA-87 key on chain, over `lockhouse-item-v1|{houseId}|{itemId}|{title}|{sha256 of the envelope}`.
- INV-3: every reader of an item was a member of that house, with a card that checked out against the chain, when it was put in. The sender is always a reader.
- INV-4: an envelope opens only with its own item id as AAD (extra data that is checked but not hidden), so a copy can't be moved to another item.
- INV-5: everything uses chain id `qorechain-diana`.
- INV-6 (U11): every stored stamp is a committed transaction signed by the paper's sender, with an ML-DSA-87 layer that checks out against their key in the phone book, whose memo is `lockhouse-stamp-v1|{SHA-256 of the INV-2 text}`.

**Transaction states.**

| Action | On chain? | States |
| --- | --- | --- |
| Register signing key (`MsgRegisterPQCKeyV2`, classical-only signature) | yes, gas | not enough test QOR → waiting for your approval → said no (nothing sent) → pending → confirmed (explorer link) / failed (reason, retry) |
| Register padlock (`MsgRegisterKEMKey`, hybrid signature) | yes, gas | same as above |
| Sign the recipient card | no (a signed message) | made in the browser after the padlock confirms |
| Sign in | no (a signed message) | signing → in / failed |
| Sign a paper when putting it in | no (a signed message) | locking → signing → stamping (U11) → saved / save failed |
| Stamp a paper (U11): `MsgSend` of 1 uqor to myself, hybrid signature, the paper's fingerprint in the memo | yes, gas | stamping (sent, waiting to be committed) → confirmed → saving / failed (reason in plain words, nothing saved, press again) |

## 4. Build phases and units

**Order (rule: setup → shared functions → demo Musts in golden-path order):** U0 → U1 → U2 → U3 → U4 → U5 → U6 → U7. Coulds U8–U10 only if time allows. U11 was added in P7 by Laras (26 Nov). Each unit is one chat. Every Must story has a unit (US-02, US-07, US-09 are Shoulds, folded into U1, U2/U4 and U5 because each is a few lines).

Every unit also: replaces that page's mock data and `?state=` jumps with the real flow, uses the shared components (AGENTS.md), and passes `better-interface`. "Est" is a rough guess for one chat.

### Phase A: Setup (testable: `npm test` runs)

### U0 — Skeleton, test setup and architecture  (Must)
Covers: —      Screens: —      Depends on: —      Est: 2h      Model: Sonnet 5.5 · medium
Installs the kits and the three cosmjs packages their testnet examples use (`@cosmjs/proto-signing`, `@cosmjs/amino`, `cosmjs-types`, for building transactions), `@scure/bip39` (secret words), `@supabase/supabase-js` and Vitest. Sets up `npm test`, one GitHub Actions job on `main`, `.env.example`, the one settings module (chain id, REST, explorer, faucet, the item purpose `lockhouse-item`), and three throwaway test accounts (secret words only in `.env.local`). Checks §3 against what the kits really need and records the commands, routes and env vars in AGENTS.md.
Acceptance:
- AC-0.1 Given a fresh checkout with `.env.local`, when Laras runs `npm test`, then the suite runs on localhost and passes.
- AC-0.2 Given two key pairs from two test accounts' secret words, when a test seals one note to both and opens it with each, then both get the note back, and a third key pair gets `NOT_A_RECIPIENT` (one lock, many readers).
- AC-0.3 Given a hybrid envelope, when a test opens it with the right X25519 secret key but not the ML-KEM-1024 secret key, then it fails (this proves the drill works before U7).
- AC-0.4 Given a push to `main`, when GitHub Actions runs, then the same suite passes in one job (repo secrets set by Laras).
- AC-0.5 Given `next build`, when the browser files are searched, then no server secret appears.
- AC-0.6 Given a staged fake key, when committing, then the gitleaks hook blocks it.
Tests: T-0.1 (unit), T-0.2 (unit), T-0.3 (unit), T-0.4 (CI), T-0.5 (build check), T-0.6 (hook check)
Laras: send each test account test QOR from the faucet (the unit prints the three qor1 addresses); add the GitHub Actions secrets.

### Phase B: Keys, padlock, sign-in (testable: a new person gets keys, registers on testnet, signs in)

### U1 — Make, back up, restore and forget my keys  (Must; restore is Should)
Covers: US-01, US-02      Screens: S-01, S-02, S-03, the Forget Keys sheet      Depends on: U0      Est: 2h      Model: Opus 5.5 · medium
Acceptance:
- AC-1.1 Given no keys in this browser, when I type my name and press Make My Keys, then 24 secret words are made in the browser, kept in this browser with my name, and no request carries them (network tab).
- AC-1.2 Given the backup screen, when it opens, then the words show once; Continue stays off until I tick that I wrote them down; after I leave, no screen shows them again.
- AC-1.3 Given keys in this browser, when I open Welcome, then it shows the returning state with my name and the next step (register padlock, sign in, or go to the house).
- AC-1.4 Given my secret words, when I restore them in another Chrome profile, then the same qor1 address comes back.
- AC-1.5 Given wrong words (wrong count or a typo that fails the checksum), when I restore, then the inline error shows and nothing is kept.
- AC-1.6 Given an empty name, when I press Make My Keys, then an inline error shows.
- AC-1.7 Given Forget Keys on This Device, when I confirm in the sheet, then the words and name leave this browser, I'm signed out (after U3), and Welcome shows the first-visit state.
Tests: T-1.1 (unit: same words → same address, signing key and QoreSeal keys), T-1.2 (e2e), T-1.3 (e2e), T-1.4 (unit + e2e), T-1.5 (unit), T-1.6 (e2e), T-1.7 (e2e)

### U2 — Register my padlock in the phone book  (Must · demo setup)
Covers: US-03, US-07      Screens: S-04      Depends on: U1      Est: 3h      Model: Opus 5.5 · high
Two real testnet transactions, built the way the kits' own examples do (QoreSign `register-and-send`, QoreSeal `register-and-encrypt`): first the ML-DSA-87 signing key with its proof of possession, then the ML-KEM-1024 padlock. Each one waits for my approval in the page. All chain calls go through `/api/chain`.
Acceptance:
- AC-2.1 Given an account with no test QOR (the chain doesn't know it yet) or less than 1 test QOR, when the page loads, then it shows Not Enough Test QOR with my address to copy and the faucet link; Check Again reads the balance again.
- AC-2.2 Given enough test QOR, when I press Register My Padlock, then one box says in plain words what both signatures do, and nothing is sent until I press Approve Both in This Browser; then step 1 is sent and, once confirmed, step 2 by itself (D-21). If only step 2 is left (a retry), it asks for that one alone.
- AC-2.3 Given an approval step, when I press Not Now, then "You said no to signing. Nothing was sent." shows, and Try Again goes back to that same step.
- AC-2.4 Given I approve both, when each is sent, then it shows Pending, then Confirmed with an explorer link for that transaction; afterwards the chain shows my signing key (proof of possession: yes) and my ML-KEM-1024 padlock.
- AC-2.5 Given step 1 is already on chain (a reload or a second visit), when the page loads, then it starts at step 2; given both are, it shows Confirmed and Continue.
- AC-2.6 Given the chain refuses a transaction or it isn't confirmed within 60 s, then Failed names the step, gives the reason in plain words (the kits' error text when there is one) and a Try Again that doesn't redo a finished step.
- AC-2.7 Given both are confirmed, then my recipient card is signed in the browser and checks out against the chain (it is saved at sign-in, U3).
- AC-2.8 Given a request to `/api/chain` for a path not on its list, or another host, then it answers 404 and forwards nothing.
Tests: T-2.1 (e2e), T-2.2 (e2e), T-2.3 (e2e), T-2.4 (integration on testnet + e2e), T-2.5 (e2e), T-2.6 (unit: error text + e2e), T-2.7 (integration), T-2.8 (unit)

### U3 — Sign in with QoreChain  (Must)
Covers: US-04      Screens: S-10, Sign Out in the menu      Depends on: U2      Est: 2.5h      Model: Opus 5.5 · high
Acceptance:
- AC-3.1 Given my padlock is registered, when I press Sign In With My Key, then the browser signs a Sign In With QoreChain message (this site's domain, chain `qorechain-diana`, a nonce from our server, my name in the statement), the server checks it against my ML-DSA-87 key on chain, and I land on the House with a session cookie (httpOnly, SameSite=Lax, Secure when deployed, 7 days).
- AC-3.2 Given my first sign-in, then my name and recipient card are saved (the card is checked against the chain first) and a house with only me in it is made.
- AC-3.3 Given a wrong nonce, another domain, a message older than 10 minutes, or an account with no signing key on chain, when the server checks it, then it refuses, nothing is saved, and the page shows "Sign-in failed. Try again."
- AC-3.4 Given a nonce that was already used, when it is sent again, then it is refused.
- AC-3.5 Given no session, when I open the House, Add Member, Put In or an item, then I'm sent to Sign In; the member-only API routes answer 401.
- AC-3.6 Given Sign Out, when I press it, then the session ends and Welcome shows; my keys stay in this browser.
- AC-3.7 Given a session but no keys in this browser, when I open a house page, then I'm sent to Welcome to restore my keys.
Tests: T-3.1 (e2e golden + integration), T-3.2 (integration), T-3.3 (unit, 4 cases), T-3.4 (unit), T-3.5 (integration), T-3.6 (e2e), T-3.7 (e2e)

### Phase C: The house (testable: a house of three, each badge real; golden step 1)

### U4 — House members and Add Member  (Must · demo-critical)
Covers: US-05, US-06, US-07      Screens: S-05 (members part), S-06      Depends on: U3      Est: 3h      Model: Opus 5.5 · high
Acceptance:
- AC-4.1 Given I'm signed in, when the House loads, then each member shows their own name, short qor1 address and a "Padlock in the Phone Book ✓" badge that links to their address on the explorer; the badge is read from the chain, not from our database.
- AC-4.2 Given I'm the only member, then the No Other Members empty state shows with Add Someone.
- AC-4.3 Given the qor1 address of someone who has registered and signed in once, when I press Add, then the server checks their card against the chain and they show on my House within 2 s; in their window, after a reload, they see my house.
- AC-4.4 Given an address with no padlock on chain, or someone who has never signed in, then "This address has no padlock in the Phone Book yet…" shows and nothing is added.
- AC-4.5 Given a card that no longer matches the chain (for example a changed padlock), then "Their signed card does not match this address. Nothing was added." shows.
- AC-4.6 Given someone whose own house has other members or papers, then "They are already in another house" shows and nothing changes; given someone alone in an empty house, then they move into mine and their empty house is removed.
- AC-4.7 Given text that isn't a qor1 address, then an inline error shows before any request.
- AC-4.8 Given someone outside the house, when they ask for this house's data, then they get 403.
- AC-4.9 Given loading or a refresh after adding, then the skeleton or "Updating the list…" shows.
Tests: T-4.1 (e2e golden), T-4.2 (e2e), T-4.3 (integration + e2e), T-4.4 (integration), T-4.5 (unit), T-4.6 (integration, 2 cases), T-4.7 (unit), T-4.8 (integration), T-4.9 (e2e)

### Phase D: Put in and open (testable: golden steps 2–5)

### U5 — The gate: lock, sign and put in, and the house's paper list  (Must · demo-critical)
Covers: US-08, US-09, US-10, US-11      Screens: S-07, S-05 (items part)      Depends on: U4      Est: 3h      Model: Opus 5.5 · medium
Acceptance:
- AC-5.1 Given a file (image or PDF) up to 2 MB, or a note, a title, and readers ticked from the house (my own name is always ticked and can't be unticked), when I press Lock and Put In, then the browser checks each reader's card against the chain, seals one hybrid envelope (ML-KEM-1024 + X25519, purpose `lockhouse-item`, the item id as AAD), and shows "Locked on This Device · ML-KEM-1024 + X25519 · {readerCount} readers" before anything is sent.
- AC-5.2 Given the locked copy, then the browser signs it with QoreSign (INV-2) and sends only the item id, title, envelope, signature and reader addresses; the file name and type travel inside the envelope.
- AC-5.3 Given a put-in request, the server stores it only if I'm in the house, every reader is in the house, the envelope reads as a hybrid QoreSeal envelope with one entry per reader, it is within the size limit, and the signature checks out against my key on chain; otherwise it answers 400 and stores nothing.
- AC-5.4 Given a file over 2 MB, then the inline error shows its size and the limit, and nothing is locked.
- AC-5.5 Given an empty title (or over 80 characters), then an inline error shows.
- AC-5.6 Given the save fails, then "Could not save. Nothing was sent. Try again." shows, and Try Again works without picking the file again.
- AC-5.7 Given it saved, then the toast shows the reader count with a link to the House, and the House lists the paper with its title, "Put in by {senderName}", date and reader count, newest first; with no papers the No Papers empty state shows.
- AC-5.8 Given 500 KB for 3 readers on the PC, then locking takes under 2 s (NF-5).
Tests: T-5.1 (e2e golden), T-5.2 (integration: route refuses unknown fields), T-5.3 (integration, 5 cases), T-5.4 (unit + e2e), T-5.5 (e2e), T-5.6 (e2e), T-5.7 (e2e), T-5.8 (timed e2e)

### U6 — Open a paper and see who put it in  (Must · demo-critical)
Covers: US-12, US-13      Screens: S-08      Depends on: U5      Est: 2.5h      Model: Sonnet 5.5 · medium
Acceptance:
- AC-6.1 Given I'm a reader, when I open a paper, then the browser checks the signature against the sender's ML-DSA-87 key on chain, opens the envelope with my keys and shows the picture, PDF or note with "Signature Checked on QoreChain" and the sender's name under the title.
- AC-6.2 Given two other readers, when each opens the same paper in their own window, then it opens for each, from the one stored copy (one row in the database).
- AC-6.3 Given I'm in the house but not a reader, then "This Paper Is Not for You" shows and the locked copy isn't sent to me.
- AC-6.4 Given the signature doesn't check out (title or copy changed in the database), then "Signature Not Proven" shows above a blurred preview (or no preview if it can't be opened), and there is no Download.
- AC-6.5 Given Download Paper, then the original file comes back with its own name and type.
- AC-6.6 Given it's working, then Opening on This Device shows; 500 KB opens in under 2 s on the PC (NF-5).
- AC-6.7 Given someone outside the house, when they ask for the item, then they get 403.
Tests: T-6.1 (e2e golden), T-6.2 (e2e golden + DB check), T-6.3 (e2e + integration), T-6.4 (integration: change a row on Staging, then e2e), T-6.5 (e2e), T-6.6 (timed e2e), T-6.7 (integration)

Golden step 5 (a member puts something in for the owner) is U5 + U6 with one other reader.

### Phase E: The drill (testable: golden steps 6–7)

### U7 — The Q-Day Drill (Simulation)  (Must · demo-critical)
Covers: US-14, US-15      Screens: S-09      Depends on: U6      Est: 3h      Model: Opus 5.5 · medium
Rebuilt on 27 Nov (D-19). Built first (24 Nov) with an old lock of our own and members giving their old keys; Laras found that confusing (a family member "helping" the thief, and a page that looked staged), so the drill is now the Thief's own page.

- AC-7.1 Given anyone, signed in or not, when they open the Drill (only linked from Welcome: Play the Thief), then it shows the stranger's header (no member name, no family menu) and "Simulation" at all times. No family page links to it.
- AC-7.2 Given Break In and Steal Everything, then the page downloads every stored copy (`GET /api/drill`: id, locked copy, date; no title, names or readers) and says how many and how big.
- AC-7.3 Given Try to Open Them, then each copy is tried with QoreSeal `open` and the Thief's own keys, all refuse, and the page shows one real copy's scrambled text and "You opened 0 of {n}".
- AC-7.4 Given It's Q-Day: Try Again, then the old lock (X25519) shows as broken, labelled Simulation; each copy is read (`parseEnvelope`) and still carries ML-KEM-1024; the page ends "You stole {n} papers. You opened 0."
- AC-7.5 Given the drill ran, when a member opens their papers, then they still open (the drill only reads copies).
- AC-7.6 Given a reader's old key (X25519) but not their ML-KEM-1024 key, then a Lockhouse copy doesn't open (T-0.3).
- AC-7.7 Given the whole app, then no page uses `?state=` and the prototype's StatePicker is deleted (and removed from AGENTS.md).
Tests: T-7.1 (e2e golden + route), T-7.2 (route), T-7.3 (e2e golden), T-7.4 (e2e golden), T-7.5 (e2e golden), T-7.6 = T-0.3 (unit), T-7.7 (code search)

**Checkpoint:** after U7 the whole golden path (§1.2) runs on localhost in four Chrome profiles.

### Phase F: Coulds (only if time allows, in this order)

### U8 — A fake "from someone" paper is refused on screen  (Could)
Covers: US-17      Screens: S-08, S-09      Depends on: U7      Est: 1.5h
- AC-8.1 Given the drill, when a member presses Try a Fake Drop-In (Simulation), then a copy that claims to be from another member but is signed with the wrong key is stored as if our server were hacked, and opening it shows Signature Not Proven. Tests: T-8.1 (e2e)

### U9 — Remove someone from the house  (Could)
Covers: US-18      Screens: S-05      Depends on: U7      Est: 1.5h
- AC-9.1 Given a member, when another member removes them and confirms, then they leave the list and can't open the house. The sheet says plainly that what they could already open stays on their device (honest limit). Tests: T-9.1 (e2e)

### U10 — Recovery key  (Could)
Covers: US-16      Screens: S-03, S-07      Depends on: U7      Est: 2h
- AC-10.1 Given a house with a recovery key (separate secret words, kept on paper), when anything is put in, then the recovery key is one more reader, and those words open it on a new device. Tests: T-10.1 (integration + e2e)

Built 24 Nov (D-16): any member makes it on `/house/recovery` (words made and shown once in the browser; only the public half, a signature and a lookup are sent). Put In checks the member's signature on chain before locking, so a hacked server can't slip in a key of its own; the server refuses a copy without the extra entry. `/recover` (no keys, no sign-in) finds and opens the papers. Removing the member who made it drops the key (they saw the words); papers already locked to it still open with its words.

### Phase G: Added in P7 (Laras, 26 Nov)

### U11 — Stamp a paper on QoreChain  (Should · demo)
Covers: US-20      Screens: S-07, S-08, S-12      Depends on: U6, U10      Est: 3h      Model: Opus 5.5 · max (Laras's choice)
Every paper gets a stamp when it is put in: a tiny transaction from the sender to themselves (1 uqor), signed hybrid (secp256k1 + ML-DSA-87), whose memo is `lockhouse-stamp-v1|{SHA-256 of the INV-2 text}`. The block time proves when the paper was put in, and no one, our server included, can change or back-date it. The memo holds a fingerprint of the signed text (house, item, title, copy), not of the copy alone, so the public store (D-12) can't be matched to senders on chain. Readers check the stamp themselves with QoreSign's `inspectTransaction` (the kit's own check, the explorer's classification), which also checks the ML-DSA-87 layer against the sender's key in the phone book.
Acceptance:
- AC-11.1 Given a paper being put in, when it is locked and signed, then the browser sends the stamp, shows "Stamping on QoreChain…", waits until it is committed (NF-6), and only then saves. The toast says it was stamped.
- AC-11.2 Given stamping fails (no test QOR, refused, not committed within 60 s, QoreChain not reached), then nothing is saved, the error says why and what to do, and pressing the button again starts over.
- AC-11.3 Given a put-in with a stamp, the server stores it only if the stamp checks out on chain (INV-6); otherwise 400 and nothing stored (503 if QoreChain can't be reached). A put-in with no stamp is still stored; its readers see Not Stamped.
- AC-11.4 Given a reader opens a stamped paper, then the browser checks the stamp itself and shows "Stamped on QoreChain · {date}", linking to the transaction on the explorer.
- AC-11.5 Given a paper with no stamp (put in before U11, or the fake drop-in), then "Not Stamped" shows. Given a stamp that doesn't prove this paper (title or copy changed, another paper's stamp, another signer), then "Stamp Doesn't Match" shows.
- AC-11.6 Given Open With Recovery Words, then each paper shows the same stamp result.
Tests: T-11.1 (integration, testnet: stamp, then check; changed text, another signer and an unknown hash don't match), T-11.2 (integration, testnet + Staging: the route stores a good stamp, refuses another paper's stamp and a malformed one, stores nothing), T-11.3 (integration: an account with no test QOR gets the reason in plain words), T-11.4 (e2e golden: Put In, then the paper shows its stamp and explorer link), T-11.5 (e2e: Not Stamped on an old paper and the fake drop-in; Stamp Doesn't Match after changing a row on Staging; Open With Recovery Words)

Built 26 Nov: `lib/stamp.ts` (`stamp`, `checkStamp`), sent through the padlock's `sendTx` (one transaction recipe, D-04). On testnet a stamp is committed in about 4 s and costs about 0.0174 test QOR in fees plus the 1 uqor. The explorer shows the memo and "Signature security: quantum-safe, verified on-chain, ML-DSA-87". Badge got an `href` option (a link to the explorer), now also used by the House padlock badges.

**Won't in this build:** group keys (US-19), a house picker (being in several houses).

## 5. Decisions log

| ID | Date | Decision | Why |
| --- | --- | --- | --- |
| D-01 | 23 Nov | Keys are made from 24 secret words with the kits' own functions (`deriveClassicalKey`, `deriveCanonicalPqKey`, `deriveSealKeys` index 0); only the words and the name are kept, in localStorage | One backup for everything; nothing to sync. A hacked device is outside the lock (README limit) |
| D-02 | 23 Nov | Order is keys → padlock → sign-in. Sign-in needs the padlock first | `verifySiwqWithChain` refuses an account with no ML-DSA-87 key on chain (QoreSign 0.2.0 types) |
| D-03 | 23 Nov | Every chain call from the browser goes through one pass-through route, `/api/chain`, with a fixed list of paths | The kits accept any `rest` address, so no extra code; no CORS risk; rule 13 (the browser talks to our server) |
| D-04 | 23 Nov | Transactions are built like the kits' testnet examples: cosmjs `TxBody` + `makeAuthInfoBytes`, fee 0.1 uqor per gas, gas from `simulateTx`, sent with `submitWithSignBytesFallback` (hybrid) or `broadcastTx` (classical-only key registration) | Copying the sponsor's working recipe is the safest; credit in the README |
| D-05 | 23 Nov | The name is in the signed Sign In With QoreChain statement; the card is saved at sign-in after the server checks it against the chain | The name is proven to come from that account, with no extra signature or route |
| D-06 | 23 Nov | Session: an httpOnly cookie signed with `SESSION_SECRET` (HMAC, Node's built-in crypto); the nonce is a short-lived signed cookie that is cleared when used | No auth library, no session table. U3 (24 Nov): a cookie alone can be replayed, so used nonces go in a `used_nonces` table (AC-3.4); `sign_in` uses up the nonce and saves in one call |
| D-07 | 23 Nov | One house per person (Must). First sign-in makes your own house; being added moves you only if your own house is empty | Keeps the house picker a Could (G2) |
| D-08 | 23 Nov | Locked copies are stored as text (`envelopeToText`) in Postgres, not in Supabase Storage | 2 MB limit; one table; no file bucket rules |
| D-09 | 23 Nov | Each envelope uses purpose `lockhouse-item` and its item id as AAD; the signature covers house, item, title and the envelope's hash | A copy can't be moved to another item or retitled without the signature failing |
| D-10 | 23 Nov | Every member's padlock badge is read live from the chain | The badge proves what the phone book says, not what our database says |
| D-11 | 23 Nov | *(Replaced by D-19, 27 Nov.)* The drill's old lock is our own: X25519 + HKDF-SHA-256 + AES-256-GCM. The Thief gets only X25519 secret keys, given on purpose by members | QoreSeal has no X25519-only mode; this follows the sponsor's drill (the thief gets the old keys, nothing for the new lock) |
| D-12 | 23 Nov | The store is public through `/api/copies` (built as `GET /api/drill`) (copies only, no titles, names or readers); titles are seen only by house members | The golden path says a copy opens nothing; titles are kept from strangers |
| D-13 | 23 Nov | S-10 loses its "Rejected" state: pressing Sign In With My Key is the approval. S-04 keeps its two approvals with Not Now | Keys live in the page, so there is no wallet pop-up to say no to at sign-in |
| D-14 | 23 Nov | The sender is always a reader of what they put in | They can see what they sent; one rule |
| D-15 | 23 Nov | The test plan was written in the main chat, not by a subagent | All acceptance criteria were already here; a subagent would re-read everything |
| D-16 | 24 Nov | The recovery key is a plain QoreSeal key from its own 24 words, not an account: no padlock on chain. Its public half is signed by the member who made it; the words find their papers through a SHA-256 lookup only they give (members see the public key, so it can't be the lookup). One per house; removing its maker drops it | QoreSeal's "recovery recipient (an offline key)". No test QOR or chain step; the signature keeps a hacked server from adding its own reader |
| D-17 | 26 Nov | U11's stamp is a `MsgSend` of 1 uqor to yourself with the fingerprint in the memo, signed hybrid like the padlock (D-04). Stamp before saving: if it fails, nothing is saved. The server checks a stamp but doesn't require one; readers check it again themselves | The testnet has no module for notes, and a memo on a self-transfer is visible in any explorer. Failing before saving keeps "every new paper is stamped" simple. Readers trusting their own check, not the server's, is the rule since D-10 |
| D-18 | 27 Nov | The menu is House · Members · Papers · {name} (Put In left the menu; its button is on House and Papers). House shows 5 members, the 5 newest papers and the recovery key; Members and Papers have the full lists. Papers loads 10 at a time with Show More Papers (not on scroll), and filters on the server: title words (Enter, 3 characters or more) and From | Laras's rework: one job per page. A filter has to run on the server, because the browser holds only the loaded papers |
| D-19 | 27 Nov | The drill is the Thief's page, the same for everyone and linked only from Welcome: steal every copy, try to open them (real QoreSeal refusals), then Q-Day (pretend) and read that each copy still carries ML-KEM-1024. Members give nothing; `drill_keys`, `POST /api/drill`, our old lock and the sample picture are gone. The family pages have no drill and no Fake Drop-In button. Replaces D-11 | A member giving their old key put the family inside the thief's story, and a page that makes its own sample looked staged. Real members' old keys never leave their devices, so only the break itself can be pretend. The server now holds no secret key at all |
| D-20 | 27 Nov | Any member can still remove another (U9 unchanged) | Laras kept it when asked on 27 Nov |
| D-21 | 27 Nov | Registering the padlock takes one approval for both transactions (they still go one after the other, each with its own Pending → Confirmed and explorer link). Changes D-13's "two approvals" | Laras on a fresh walk-through: pressing Approve twice felt like the first one hadn't worked. The keys live in the page, so there is no wallet asking per transaction |

## 6. Open questions

1. ~~For Laras at G5~~ Settled 23 Nov: Laras kept all four picks: D-12 (titles hidden from the public store, seen by the house), NF-4 (2 MB limit), D-13 (no Rejected state at sign-in), D-14 (sender always a reader).
2. ~~Explorer link format~~ Settled 23 Nov (U2): `https://explore.qore.network/tx/{hash}` and `/address/{qor1…}`. The explorer keeps Testnet/Mainnet in its own header switch (a cookie; `?network=testnet` does nothing), so the page says "Switch it to Testnet at the top". Faucet: https://dashboard.qorechain.io/faucet (needs sign-in there).
3. Keep checking until the deadline: the drill's attack log, look-alike projects, rule changes (from §1.6).
