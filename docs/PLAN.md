# Lockhouse: plan

*§1 written 23 Nov 2026 (P1, chat lockhouse-01). The idea is Laras's and is final: [internal/qorechain-2026-final-idea.md](../internal/qorechain-2026-final-idea.md). This file only adds what the build needs. §2–§6 come in P5.*

## 1. Context and golden path

### 1.1 Problem, user, differentiator (short; full text in the final idea file)

- **Problem:** KTP and KK photos sit in chats, galleries and cloud backups, where anyone with a copy can read them. Copies locked the old way open after Q-Day.
- **User:** you and the people in your house (your family, or anyone you trust). Demo accounts: three family members with made-up names, **Ayu** ("Me", the house owner), **Tari** (her sister) and **Ratna** (their mom), plus a **Thief**. The app always shows each person's own name, never "Me", "Sister" or "Mom" (see [DESIGN.md](DESIGN.md) "Names").
- **The rule:** "This is a house, not everyone can enter."
- **Differentiator:** a family house where sharing uses the new padlock (ML-KEM-1024 via QoreSeal), each person's keys stay on their own device, the padlocks sit in QoreChain's public phone book, and what family members put in for each other is signed (QoreSign). Closest outside: Ente Locker (old padlock), Qpher Vault (company keeps the keys). None of 133 fest projects is a family house.

### 1.2 Golden path (the 60–90-second demo)

Before recording: the three family accounts are set up (padlocks registered on testnet, signed cards published) and the Thief window is open. All papers are made-up samples.

1. **Ayu's house.** Ayu's window shows the house: Ayu, Tari and Ratna, each with a "Padlock in the Phone Book ✓" badge that links to the registration on the testnet explorer.
2. **The gate.** Ayu drops in the sample family KK and ticks Tari and Ratna. The screen shows it being locked in this browser ("Locked on This Device · ML-KEM-1024 + X25519 · 3 readers") before it's sent. Only the locked copy is stored.
3. **Tari opens it.** In Tari's window the KK appears, "Put in by Ayu". Tari opens it; it unlocks in her browser.
4. **Ratna opens the same lock.** In Ratna's window the same single locked copy opens too (one lock, many readers).
5. **Ratna puts something in for Ayu.** Ratna puts in a private note for Ayu. It's locked to Ayu's padlock and signed. In Ayu's window it shows "From Ratna · Signature Checked on QoreChain ✓".
6. **The drill (labelled "Simulation").** The Thief window already holds every stored copy (the store is public: a copy opens nothing). The Thief presses "Pretend Q-Day": the Thief is handed the old keys, as a quantum computer would work them out. The old-lock copy of the sample KTP opens; every Lockhouse copy stays shut.
7. **The family is still fine.** Back in Tari's window, the KK still opens. End card: the tagline.

Steps 2–6 are each about 10–15 seconds. The account setup (making keys, registering the padlock) is shown in the longer video, not in these 90 seconds.

### 1.3 How it meets the score

| Part (weight) | Golden-path step |
| --- | --- |
| Works as described (25%) | Every step runs on testnet; only the Thief's power in step 6 is pretend, and it says so |
| QoreChain tech usage (25%) | Step 1 (PQC key + KEM key registration, signed cards), step 2 (QoreSeal in the browser), step 5 (QoreSign checked against chain) |
| Post-quantum correctness (20%) | Step 6: the old lock breaks, the hybrid lock holds because of ML-KEM-1024; honest limits in the README |
| Originality (15%) | The family house itself (steps 1, 3–5) |
| Clarity, UX, docs (15%) | One gate, one list, one drill; the README limits |
| Best AI-Native Build ($500) | `AI_USAGE.md` from the notes in `internal/ai-usage-notes.md` |

### 1.4 Scope (MoSCoW)

| | What |
| --- | --- |
| **Must** | Sign in with your QoreChain key (Sign In With QoreChain, so only you can add to your house) · add a family member by their qor1 address (their signed card is checked first) · make your keys in the browser from secret words (shown once as the backup) · register the padlock: ML-DSA-87 key with proof of possession, then `MsgRegisterKEMKey`, plus the signed card · the house list (members, their badges) · the gate: lock in the browser for chosen members, store only the locked copy · the house's item list · open in the browser · a family member's signed drop-in, checked against the chain · the drill (old-lock copy + Thief, labelled "Simulation") |
| **Should** | A photo size limit with a clear message · explorer links on every on-chain step |
| **Could** | Being in several houses (a house picker) · a recovery key · a fake "from Ratna" drop-in being refused on screen · remove a member · group keys that stop a removed member reading new items |
| **Won't** | Mainnet · an app to install · offline/Bluetooth · messaging · "after I'm gone" · the QoreX wallet as the key holder (it can't give the house its lock keys; see 1.5) |

### 1.5 Technical answers found in P1 (checked 23 Nov)

- **QoreSeal works in the browser.** `@qorechain/qoreseal` 0.1.0 and `@qorechain/qoresign` 0.2.0 are pure JavaScript (noble/scure libraries, no Node-only imports). Both have everything the build needs: `seal`/`open`, `deriveSealKeys`, `buildRegisterKemKeyMessage`, `signRecipientCard`/`verifyRecipientCard`, `buildRegisterPqKeyMessage`, `signProofOfPossession`, `signHybrid`, `broadcastTx`, `signMessage`, `verifyMessageWithChain`, `signSiwq`/`verifySiwqWithChain`.
- **Keys live in the browser.** Each person's secret words are made in their browser and kept there; the words are the backup and the way onto a new device. The keys never reach our server. QoreX can't be the key holder, because the house needs lock keys made from the secret words and a wallet doesn't hand those out.
- **Gas:** each family account needs test QOR for its two registrations (faucet: 100 per 24 h). The Thief needs none.
- **Where locked copies go:** a hosted database that only ever holds locked copies (Supabase), reached through our own server routes. Not on chain: a KTP photo is about 150–500 KB, too big for a transaction.
- **Size:** a locked copy is the file + 56 + 1,664 bytes per reader (3 readers ≈ 5 KB extra).
- **The drill:** the old-lock copy uses only X25519 (the classical part). The Thief is handed the X25519 secret keys. That opens the old-lock copy, but not the Lockhouse copy, because its ML-KEM-1024 part is still missing. This follows the sponsor's drill: the thief gets the old keys, nothing for the new lock.
- **Demo windows:** settled at G2 (see [DESIGN.md](DESIGN.md) "G2 answers"): Ayu and Tari on phones, Ratna and the Thief on the PC in two browsers. Build and test with four Chrome profiles.

### 1.6 Open questions

1. ~~Accounts~~ Settled 23 Nov: GitHub https://github.com/ervhint/lockhouse (public, empty, created 23 Nov) · Supabase org `ervhint`, Staging `egtxrdfhmtdiujdiywkm`, Prod `htghbmdautdpgzalysko` · Vercel team `ervhint`, project `lockhouse-qorechain` (created 23 Nov, no deploy yet; lockhouse-qorechain.vercel.app was free on 23 Nov and is claimed at the first production deploy in P7).
2. ~~Recovery key~~ Settled 23 Nov: **Could** (Laras: "if we have time, we might build it"). Until then the secret words are the backup, and the README says so.
3. ~~Fest feed and the repo~~ Settled 23 Nov: the repo is public and linked, the QoreChain Build app is installed, and the first commit is counted. AI-Native and Regional Indonesia are saved on the project page.
4. Keep checking until the deadline: the drill's attack log, look-alike projects, rule changes.

### 1.7 Stack

Next.js (App Router) + TypeScript + Tailwind · our own server routes for the store (rule 13) · Supabase Postgres for locked copies and house membership (no Supabase Auth: you sign in with your QoreChain key) · Vercel · Vitest · `@qorechain/qoreseal`, `@qorechain/qoresign` (both counted as kits on the project page). No smart contract, so no Foundry and no `test` branch.

## 2–6

*Written in P5.*
