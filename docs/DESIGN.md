# Lockhouse: design

*Started 23 Nov 2026 (P2, chat lockhouse-02). Golden path: [PLAN.md §1.2](PLAN.md).*

**FigJam board:** https://www.figma.com/board/YJ3XAssAtb5I5KtXeFSX77 (User Stories section on top, Page Flow below). Made with the Figma MCP, not the Mermaid fallback.

## Stories (full text on the board)

| ID | MoSCoW | Golden path | Short |
| --- | --- | --- | --- |
| US-01 | Must | before demo | Make my keys in this browser from secret words, shown once |
| US-02 | Should | | Restore my keys from my secret words on a new device |
| US-03 | Must | before demo | Register my padlock (ML-DSA-87 key + proof, then `MsgRegisterKEMKey`) and signed card |
| US-04 | Must | every visit | Sign in with my QoreChain key (G2: moved up from Should) |
| US-05 | Must | step 1 | See house members with a "Padlock in the Phone Book ✓" badge (explorer link) |
| US-06 | Must | before demo | Add someone by qor1 address after their signed card is checked (G2: moved up from Should) |
| US-07 | Should | | Explorer link on every on-chain step |
| US-08 | Must | step 2 | Gate: drop a paper, pick readers, "Locked on This Device" before sending |
| US-09 | Should | | Clear message when a photo is too big |
| US-10 | Must | step 5 | What I put in for someone carries my signature (QoreSign) |
| US-11 | Must | step 3 | See the house items and who put each one in |
| US-12 | Must | steps 3–4 | Open an item in my own browser; one locked copy, many readers |
| US-13 | Must | step 5 | "From Ratna · Signature Checked on QoreChain ✓" (the sender's own name) |
| US-14 | Must | step 6 | Thief presses "Pretend Q-Day" (Simulation): old-lock copy opens, Lockhouse copies stay shut |
| US-15 | Must | step 7 | After the drill, my items still open |
| US-16 | Could | | Recovery key |
| US-17 | Could | | A fake "from Ratna" item refused on screen |
| US-18 | Could | | Remove someone from the house |
| US-19 | Could | | Group keys, so a removed member can't read new items |

## Screen inventory

| ID | Screen | Stories | States to design (P4) |
| --- | --- | --- | --- |
| S-01 | Welcome | US-01, US-02 | first visit; keys already in this browser |
| S-02 | Make or Restore Keys | US-01, US-02 | type your name; making; wrong words |
| S-03 | Secret Words Backup (shown once) | US-01 | shown; confirm you saved them |
| S-04 | Register Padlock | US-03, US-07 | not enough test QOR (faucet link); sign 1 of 2; sign 2 of 2; I said no to signing (nothing sent, try again); pending; confirmed; failed (explorer link, retry) |
| S-05 | House (members + items) | US-05, US-06, US-11 | loading; no other members yet; no items yet; "list updating…"; menu: Sign Out, Forget Keys on This Device (asks first: words needed to come back) |
| S-06 | Add Member | US-06 | checking card; no padlock in phone book; bad card; added |
| S-07 | Gate (Put In) | US-08, US-09, US-10 | choose file or note; pick readers; too big; locking; signing; saved; save failed (nothing sent) |
| S-08 | Item | US-12, US-13, US-17 | opening; opened + "Signature Checked"; not for you; signature not proven |
| S-09 | Drill (Simulation) | US-14, US-15 | all stored copies listed; Pretend Q-Day running; result |
| S-10 | Sign In With QoreChain | US-04 | signing; rejected; failed |

**Web3 states covered** (workflow, Web3 track): no wallet connect (keys live in the page, not in QoreX), so "connect" is replaced by make/restore keys and sign-in. Wrong network → the app only talks to `qorechain-diana`. Signature request → S-04 says what each of the two signatures does. Insufficient funds → S-04 faucet branch. Submitted → pending → confirmed / failed with explorer link → S-04. Stale data → S-05 "list updating…".

## Names (G2, Laras)

"Me", "Sister" and "Mom" are only how we talk about the demo people in our docs. They are not their names. **The app always shows each person's own name**: the name they type when they make their keys (S-02). It is kept with their house membership and shown next to a short qor1 address. No screen, sample, seed or mock ever says "Me", "Sister" or "Mom".

Demo people (made up, not Laras's family): **Ayu** (the house owner), **Tari** (her sister), **Ratna** (their mom). The Thief is not a person in the house; its window is labelled "Thief (Simulation)".

## G2 answers (23 Nov, Laras)

1. **The house:** one shared house. In the demo it's Ayu's house; Tari and Ratna are members. Anyone in the house can add someone. A person can make their own house too. For the build: one house per person is Must; a house picker (being in several houses) is Could.
2. **Add Member (US-06):** Must. Tari and Ratna join through the real screen, not a hidden script.
3. **Sign In (US-04):** Must. Without it our server can't tell who is asking.
4. **Demo devices:** four separate browsers. Ayu and Tari on their phones (Chrome), Ratna on the PC, the Thief on the PC in another browser (Edge). So every screen must work at phone width. Phones can't open the PC's localhost, so building and testing use four Chrome profiles on the PC; the real-device recording happens after the P7 deploy.
5. **One gate, every item signed:** Laras left it to me. Every item is signed by the person who put it in, and every item shows "Put in by <name> · Signature Checked ✓". One rule, and QoreSign shows on every item.
6. **The drill's old keys:** Laras left it to me. Only the drill's made-up sample KTP has an old-lock copy. Each family member's window has a "Give My Old Keys to the Drill (Simulation)" button, so the Thief can show those keys don't open Lockhouse copies.

Added to the flow at G2: empty states, Sign Out / Forget Keys, and "I said no to signing" on S-04.
