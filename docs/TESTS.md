# Lockhouse: test plan

*Written 23 Nov 2026 (P5) from the acceptance criteria in [PLAN.md §4](PLAN.md). Results are filled in during P6 (each unit) and P7 (the full run). Result: ✅ pass · ❌ fail · ⏭ not run yet.*

## How to run

- **Automated:** `npm test` on localhost (Vitest). Unit tests run offline. Integration tests use the hosted Supabase **Staging** project (`egtxrdfhmtdiujdiywkm`) and the `qorechain-diana` testnet with the three throwaway test accounts (`TEST_MNEMONIC_1..3` in `.env.local`). They clean up their own rows. GitHub Actions re-runs the same suite on pushes to `main`.
- **Browser (e2e):** Claude in Chrome on http://localhost:3000, at **1440px and 375px**. Four Chrome profiles, one per window: Owner, Member A, Member B, Thief (the Thief profile has no keys and never signs in). The demo names (Ayu, Tari, Ratna) are used only in these test accounts and the recording.
- **Evidence:** a screenshot name or a short log line per test.

## Tests

| ID | Covers | Type | Steps (short) | Expected | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| T-0.1 | AC-0.1 | unit | `npm test` on a fresh checkout | suite runs and passes | ✅ | `npm test` 2/2 on 23 Nov |
| T-0.2 | AC-0.2 | unit | seal one note to keys from test words 1 and 2; open with each; open with 3 | 1 and 2 get the note; 3 gets `NOT_A_RECIPIENT` | ✅ | tests/seal.test.ts |
| T-0.3 | AC-0.3 | unit | open a hybrid envelope with the right X25519 secret and a wrong ML-KEM-1024 secret | fails | ✅ | tests/seal.test.ts |
| T-0.4 | AC-0.4 | CI | push to `main` | one GitHub Actions job, green | ✅ | Actions run on d7883f8, 28 s |
| T-0.5 | AC-0.5 | build check | `next build`, search `.next/static` for the secret names and values | nothing found | ✅ | `npm run check:build`: clean |
| T-0.6 | AC-0.6 | hook check | stage a fake key, try to commit | gitleaks blocks it | ✅ | hook exit 1 on a fake AWS key (2 findings) |
| T-1.1 | AC-1.1 | unit | derive twice from the same words | same address, signing key, QoreSeal keys | ✅ | tests/keys.test.ts (23 Nov) |
| T-1.2 | AC-1.1, AC-1.2 | e2e | new profile → Make Your Keys → name → Make My Keys → backup | 24 words shown once, Continue off until ticked, no request carries the words | ✅ | Chrome 23 Nov: 24 words match localStorage; Continue off until ticked; only page GETs, no body; reload shows "already shown" |
| T-1.3 | AC-1.3 | e2e | reopen Welcome with keys kept | returning state with my name and the next step | ✅ | Chrome: "Welcome back, {name}" + Continue and "Next: Register Your Padlock" → /padlock (U2/U3 pick sign in / house later) |
| T-1.4 | AC-1.4 | unit + e2e | restore test words 1 in a fresh profile | same qor1 address as the test account | ✅ | unit: test words 1 → qor1w0c3…s60ha (tests/keys.test.ts). e2e done in one profile with the public BIP-39 vector, not a 2nd profile |
| T-1.5 | AC-1.5 | unit | restore with 23 words; with one word changed | inline error, nothing kept | ✅ | tests/keys.test.ts; Chrome: bad last word → inline error, localStorage empty |
| T-1.6 | AC-1.6 | e2e | Make My Keys with an empty name | inline error | ✅ | Chrome: "Type your name.", focus on the field, nothing kept |
| T-1.7 | AC-1.7 | e2e | menu → Forget Keys on This Device → confirm | words and name gone, signed out, Welcome first-visit | ✅ (part) | Chrome: words + name gone, Welcome first visit. "Signed out" waits for U3 |
| T-2.1 | AC-2.1 | e2e | open Register Padlock with a new, unfunded account; then fund it; Check Again | Not Enough Test QOR + address + faucet link; then the start button | ✅ (part) | Chrome 23 Nov, new unfunded keys: Not Enough Test QOR, "0 test QOR", full address + Copy, faucet link (dashboard.qorechain.io/faucet, new tab), Check Again re-reads via /api/chain (3 GETs). Funding a fresh account not run (faucet needs Laras's sign-in) |
| T-2.2 | AC-2.2 | e2e | Register My Padlock | Signature 1 of 2 explains itself; nothing sent before Approve (network tab) | ✅ | Chrome 24 Nov, test account 2 ("Tari"): Signature 1 of 2 shows what it signs; no /api/chain request until Approve; focus lands on Approve |
| T-2.3 | AC-2.3 | e2e | Not Now at step 1, then Try Again; same at step 2 | "You said no to signing. Nothing was sent."; back at the same step | ✅ | Chrome: Not Now at step 1 and at step 2 → "You said no to signing. Nothing was sent.", no request; Try Again (keyboard) → same step |
| T-2.4 | AC-2.4 | integration + e2e | approve both on a funded test account | Pending → Confirmed with explorer links; chain shows signing key (proof: yes) and ML-KEM-1024 padlock | ✅ | integration: test account 1 (tx 2DF49CA2…9776, 5F6B0560…1193). e2e: test account 2 in Chrome, Pending with tx link → Confirmed: tx 4D2640D0…FBF9 (signing key), 60DA5F5C…FC8B (padlock), both code 0; chain: hybrid, possession_proven true, mlkem1024 at height 10639823 |
| T-2.5 | AC-2.5 | e2e | reload after step 1; reload after both | starts at step 2; then Confirmed + Continue | ✅ | Chrome: reload after step 1 → step 1 ✓, Register goes to Signature 2 of 2; reload after both → Confirmed ×2, card checked, Continue → /sign-in |
| T-2.6 | AC-2.6 | unit + e2e | map refusal codes 250–254 to text; force a refusal | Failed names the step, plain reason, Try Again skips finished steps | ✅ (unit) · e2e ⏭ | tests/padlock.test.ts: codes 250–254, simulation refusal, insufficient funds, network down. A real refusal was not forced in Chrome |
| T-2.7 | AC-2.7 | integration | sign the card for a registered test account, check it against the chain | `verifyRecipientCard` passes | ✅ | tests/padlock.test.ts: signCard → checkCard passes against the chain; a changed X25519 key is refused |
| T-2.8 | AC-2.8 | unit | `/api/chain` with an unlisted path; with a full URL to another host | 404, nothing forwarded | ✅ | tests/chain-route.test.ts: 4 unlisted paths/other host → 404, fetch never called; a listed path goes to api-testnet.qore.host only |
| T-3.1 | AC-3.1 | e2e golden + integration | Sign In With My Key | lands on the House; cookie is httpOnly, SameSite=Lax, 7 days | ⏭ | |
| T-3.2 | AC-3.2 | integration | first sign-in of a test account | people row with name + checked card; a house with one member | ⏭ | |
| T-3.3 | AC-3.3 | unit | verify with a wrong nonce; another domain; an 11-minute-old message; an account with no signing key | each refused, nothing saved | ⏭ | |
| T-3.4 | AC-3.4 | unit | send the same nonce twice | second one refused | ⏭ | |
| T-3.5 | AC-3.5 | integration | call the member routes and open the house pages with no session | 401 / sent to Sign In | ⏭ | |
| T-3.6 | AC-3.6 | e2e | menu → Sign Out | Welcome; keys still in the browser | ⏭ | |
| T-3.7 | AC-3.7 | e2e | keep the session cookie, clear the keys, open the House | sent to Welcome | ⏭ | |
| T-4.1 | AC-4.1 | e2e golden | Owner's House with two members | own names, short addresses, badges link to the explorer; badge read from the chain (network) | ⏭ | |
| T-4.2 | AC-4.2 | e2e | House of a new account | No Other Members + Add Someone | ⏭ | |
| T-4.3 | AC-4.3 | integration + e2e | Owner adds Member A's address | on the list within 2 s; Member A sees the Owner's house after reload | ⏭ | |
| T-4.4 | AC-4.4 | integration | add an address with no padlock; one that never signed in | "no padlock in the Phone Book yet", nothing added | ⏭ | |
| T-4.5 | AC-4.5 | unit | a card whose keys don't match the chain | "signed card does not match", nothing added | ⏭ | |
| T-4.6 | AC-4.6 | integration | add someone whose house has papers; add someone alone in an empty house | refused; moved and the empty house removed | ⏭ | |
| T-4.7 | AC-4.7 | unit | add "hello" and a 0x address | inline error, no request | ⏭ | |
| T-4.8 | AC-4.8 | integration | a non-member session asks for the house | 403 | ⏭ | |
| T-4.9 | AC-4.9 | e2e | slow the network; add a member | skeleton; "Updating the list…" | ⏭ | |
| T-5.1 | AC-5.1 | e2e golden | Owner puts in a sample paper for Member A and Member B | "Locked on This Device · ML-KEM-1024 + X25519 · 3 readers" before the request goes | ⏭ | |
| T-5.2 | AC-5.2 | integration | send a put-in with an extra field (e.g. `file`) | refused; a good request holds only id, title, envelope, signature, readers | ⏭ | |
| T-5.3 | AC-5.3 | integration | put in as a non-member; with a non-member reader; a broken envelope; wrong entry count; a bad signature | each 400, nothing stored | ⏭ | |
| T-5.4 | AC-5.4 | unit + e2e | choose a 3 MB file | inline error with size and limit, nothing locked | ⏭ | |
| T-5.5 | AC-5.5 | e2e | empty title; 81 characters | inline error | ⏭ | |
| T-5.6 | AC-5.6 | e2e | go offline, put in, come back, Try Again | error toast, then saved without picking the file again | ⏭ | |
| T-5.7 | AC-5.7 | e2e | after saving; and a house with no papers | toast + link; paper on top of the list with title, sender, date, readers; No Papers state | ⏭ | |
| T-5.8 | AC-5.8 | timed e2e | lock 500 KB for 3 readers on the PC | under 2 s | ⏭ | |
| T-6.1 | AC-6.1 | e2e golden | Member A opens the paper | it opens; "From {senderName} · Signature Checked on QoreChain" with the Owner's name | ⏭ | |
| T-6.2 | AC-6.2 | e2e golden + DB check | Member B opens the same paper | it opens; the item has one row and one envelope | ⏭ | |
| T-6.3 | AC-6.3 | e2e + integration | a member who isn't a reader opens it | "This Paper Is Not for You"; the envelope isn't sent | ⏭ | |
| T-6.4 | AC-6.4 | integration + e2e | change the title (then the envelope) of a test row on Staging; open it | Signature Not Proven, blurred or no preview, no Download | ⏭ | |
| T-6.5 | AC-6.5 | e2e | Download Paper | same file name and type as put in | ⏭ | |
| T-6.6 | AC-6.6 | timed e2e | open 500 KB on the PC | Opening state; under 2 s | ⏭ | |
| T-6.7 | AC-6.7 | integration | a non-member session asks for the item | 403 | ⏭ | |
| T-7.1 | AC-7.1 | e2e golden | Thief profile opens the Drill | every stored copy listed, no titles or names; "Simulation" visible | ⏭ | |
| T-7.2 | AC-7.2 | e2e + network check | Member A → Give My Old Keys to the Drill (Simulation) → confirm | request holds only the old-lock copy and the X25519 secret key | ⏭ | |
| T-7.3 | AC-7.3 | e2e golden | Thief → Pretend Q-Day | old-lock copy opens and shows the drill sample; every Lockhouse copy stays shut with the reason | ⏭ | |
| T-7.4 | AC-7.4 | e2e | Pretend Q-Day with no old keys given | the page says a family member must give them first | ⏭ | |
| T-7.5 | AC-7.5 | e2e golden | after the drill, Member A opens the paper again | still opens | ⏭ | |
| T-7.6 | AC-7.6 | unit | old lock: open with the right X25519 key; with another | opens; fails | ⏭ | |
| T-7.7 | AC-7.7 | code search | search for `?state=` and `StatePicker` | none left | ⏭ | |
| T-8.1 | AC-8.1 | e2e (Could) | Try a Fake Drop-In (Simulation), then open it | Signature Not Proven | ⏭ | |
| T-9.1 | AC-9.1 (Could) | e2e | remove Member B and confirm | gone from the list; can't open the house; the sheet states the limit | ⏭ | |
| T-10.1 | AC-10.1 (Could) | integration + e2e | put in with a recovery key; open with the recovery words in a new profile | opens | ⏭ | |

## Golden path run (P7, in order)

Four profiles, all accounts set up first (keys, padlock, sign-in, house of three). Run at 1440px, then the Owner and Member A windows again at 375px.

| Step (PLAN §1.2) | Tests | Result |
| --- | --- | --- |
| 1 The house | T-4.1 | ⏭ |
| 2 The gate | T-5.1, T-5.7 | ⏭ |
| 3 Member A opens it | T-6.1 | ⏭ |
| 4 Member B opens the same lock | T-6.2 | ⏭ |
| 5 Member B puts something in for the Owner | T-5.1 (one reader) + T-6.1 in the Owner's window | ⏭ |
| 6 The drill | T-7.1, T-7.2, T-7.3 | ⏭ |
| 7 Still fine | T-7.5 | ⏭ |

## Page states (each unit checks its own, at 1440px and 375px)

| Screen | States | Unit | Result |
| --- | --- | --- | --- |
| S-01 Welcome | first visit; keys already in this browser | U1 | ✅ 1366px + 375px (in a 375px frame; Chrome would not resize the window) |
| S-02 Make or Restore Keys | type your name; making; restore; wrong words | U1 | ✅ 1366px + 375px (in a 375px frame; Chrome would not resize the window) |
| S-03 Secret Words Backup | shown; confirm you saved them | U1 | ✅ 1366px + 375px (in a 375px frame; Chrome would not resize the window) |
| S-04 Register Padlock | not enough test QOR; sign 1 of 2; sign 2 of 2; said no; pending; confirmed; failed | U2 | ✅ 1366px + 375px (375px frame): not enough test QOR, loading, sign 1 of 2, said no, pending, sign 2 of 2, confirmed. Failed: unit only |
| S-05 House | loading; no other members; no papers; updating; Forget Keys sheet | U4, U5, U1 | ⏭ |
| S-06 Add Member | checking card; no padlock; bad card; already in another house; added | U4 | ⏭ |
| S-07 Gate | choose file or note; pick readers; too big; locking; signing; saved; save failed | U5 | ⏭ |
| S-08 Item | opening; opened + Signature Checked; not for you; signature not proven | U6 | ⏭ |
| S-09 Drill | stored copies; gave old keys; Pretend Q-Day running; result; no old keys yet | U7 | ⏭ |
| S-10 Sign In | ready; signing; failed | U3 | ⏭ |

## Latest run

None yet.
