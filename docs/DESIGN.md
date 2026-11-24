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

**Update 23 Nov (P3, Laras):** the names are only examples. Writing on the landing page and explainer text stays general ("your family", "the people you pick"). Names appear only where the app shows an actual person.

## G2 answers (23 Nov, Laras)

1. **The house:** one shared house. In the demo it's Ayu's house; Tari and Ratna are members. Anyone in the house can add someone. A person can make their own house too. For the build: one house per person is Must; a house picker (being in several houses) is Could.
2. **Add Member (US-06):** Must. Tari and Ratna join through the real screen, not a hidden script.
3. **Sign In (US-04):** Must. Without it our server can't tell who is asking.
4. **Demo devices:** four separate browsers. Ayu and Tari on their phones (Chrome), Ratna on the PC, the Thief on the PC in another browser (Edge). So every screen must work at phone width. Phones can't open the PC's localhost, so building and testing use four Chrome profiles on the PC; the real-device recording happens after the P7 deploy.
5. **One gate, every item signed:** Laras left it to me. Every item is signed by the person who put it in, and every item shows "Put in by <name> · Signature Checked ✓". One rule, and QoreSign shows on every item.
6. **The drill's old keys:** Laras left it to me. Only the drill's made-up sample KTP has an old-lock copy. Each family member's window has a "Give My Old Keys to the Drill (Simulation)" button, so the Thief can show those keys don't open Lockhouse copies.

Added to the flow at G2: empty states, Sign Out / Forget Keys, and "I said no to signing" on S-04.

## P3 samples (23 Nov, lockhouse-03)

Ten references from Laras (`internal/design-references/design-references-01…10.txt`, private). Each one is a page on localhost: `/samples/01` … `/samples/10` (list at `/samples`). The samples live in `public/samples/` and `app/samples/` and are **gitignored** (Laras: never commit them). P4a deletes all but the picked one.

**Same for every sample:** brand, copy and numbers swapped for Lockhouse (people by name: Ayu, Tari, Ratna; no made-up trust claims or partner logos). The references' **pictures and videos are kept** as they are (ship, solar house, city, bridge…), so each shows its real look; the picked one needs our own pictures in P4a. Labels are written in Title Case; where a reference shows labels in capitals (07, 08, 10 kickers, 04 eyebrow), the capitals stay as its style. Checked in Chrome at desktop width (the screen gives a 1366×577 view, not 1440×900) and at 375px in a phone frame.

| # | Reference | Built | Changed / missing (everything else done) |
| --- | --- | --- | --- |
| 01 | Halden bowl-glow scroll | From spec | Nav button 166px wide (was 142) to fit "Make Your Keys"; partner wordmarks → the papers (KTP, Kartu Keluarga, Akta Lahir…); headline line break hidden on phones |
| 02 | Lumen Roof fog toggle | Reference code, exact | Morning / Night → Today / After Q-Day |
| 03 | Vela cycling word | From spec | Words Share / Sign / Lock / Open + "in Your House"; store buttons → Make Your Keys / Restore Keys (no app to install); stats → true facts (1,664 B per reader, 0 keys on our server, 3 readers); Inter Tight from Google Fonts, not self-hosted |
| 04 | Facet glass shards | From spec | Pointer push ignores the tilt; the DOM text layer follows the whole panel, not each lifted shard; five terms → Padlock, Secret Words, The Gate, Signature, The Drill. Slow on weak phones |
| 05 | halo glass prism | From spec | Glass shader written to the spec in GLSL, not a line-by-line port of vgpu's WGSL; no back-face bounce pass (port it if 05 is picked) |
| 06 | Next Layer cinematic video | From spec | IpsumMark font not supplied → Manrope (the spec's fallback); logoipsum marks → QoreSeal, QoreSign, ML-KEM-1024, Diana Testnet |
| 07 | NORVA night city scroll | From spec | Steps 01–04 = Make Your Keys, Register Your Padlock, Lock a Paper, Open It at Home |
| 08 | Stratum stone house | Reference code, exact | Local files not supplied → videos and still from the CloudFront URLs (not re-encoded), Inter + Chakra Petch from Google Fonts (not subsets); STRATUM wordmark → LOCKHOUSE in Chakra Petch; chapters → The House, The Gate, The Readers, The Signature, The Drill, The Phone Book |
| 09 | Cinematic liquid glass | From spec (React + Tailwind + Lucide) | Metadata row → ML-KEM-1024 + X25519, 3 Readers, Diana Testnet. Checked in Chrome after the reload-loop fix |
| 10 | Mostar layered scroll | From spec | **Ogg Medium font missing**: its host blocks other sites (no CORS) and Ogg is a paid font → plain serif; sight cards → papers in Ayu's house |

**Risks for the picked one (decide at G3):**
- All pictures and videos sit on other people's CloudFront / figma.site accounts. A removed file breaks the demo, and the licence is unclear. The picked sample needs project copies or our own pictures.
- 10's Ogg font is paid (Sharp Type). 08's videos are about 16 MB in total.
- ~~Dev server reload loop~~ fixed 23 Nov: the project's setup now matches paypal-soul (see PROGRESS.md).

**G3 pick (23 Nov, Laras): 02** (house in the fog, Today / After Q-Day switch). 10 is out. Laras: the 02 pictures are free to use. The 6 pictures are copied into `public/img/house/` (sky, ground and house cut-out, morning and night; 2.2 MB, from the images.higgs.ai URLs in the reference), and sample 02 now loads them from there. Font: Instrument Sans (Google Fonts, free licence).

## P4 (24 Nov, lockhouse-04)

**Tokens** (from sample 02, in `app/globals.css`): night `#0b1426`, slate `#1b2736`, mist `#eef1f6`, muted `#b4bfce`, lime `#e2ee9f` (primary action), amber `#e8a066` (warnings), danger `#f4a08e`. Font: Instrument Sans (400/500/600). Pills for buttons, 16px panels. Motion: only the Welcome fog and switch; app pages are calm; reduced-motion respected.

**Routes:** `/` S-01 · `/keys` S-02 · `/keys/backup` S-03 · `/padlock` S-04 · `/house` S-05 · `/house/add` S-06 · `/put-in` S-07 · `/item/[id]` S-08 · `/drill` S-09 · `/sign-in` S-10. Every state in the inventory is reachable with `?state=…` (the "Prototype States" box bottom-left lists them). BFF mock: `GET /api/house` (data in `lib/mock.ts`, all `{placeholders}`). (P4 prototype only: the `?state=` jumps, StatePicker and `lib/mock.ts` were removed in U7.)

**Image list:** S-01 uses the 6 house pictures in `public/img/house/`. S-02 to S-10 use the night sky picture (blurred, dimmed) behind the header; no other pictures. Icons: lucide. Nothing missing.

**Changes from sample 02:** the five dead nav links (How It Works, The Drill, Phone Book, Security, Docs) are dropped, since those pages do not exist; the nav keeps Sign In and Make Your Keys. Added a line under the caption: "Restore Your Keys" (first visit) or the returning-user line.

**better-interface review (24 Nov, all 10 screens, desktop + 375px via iframes):** fixed: (1) House-type header was 440px wide at 375px, now wraps; (2) night picture was hidden behind the body (`isolate` added); (3) Welcome fog kept drifting under reduced motion, now one still frame; (4) Welcome text was 11px on short screens, now 13px minimum; (5) nav and sheet-close hit areas 36-39px, now 44px or more; (6) error toast is `role="alert"`; (7) secret-words field has autocomplete, capitals and spellcheck off; (8) three status sentences were Title Case, now sentence case; (9) headings `text-balance`, buttons press at 0.96 and name their transition properties.
**Left open:** Sheet has no Esc key or focus trap, background not inert (P6, real `<dialog>`); error toast has no dismiss (P6, with real save errors); panel radius 16px vs rows 12px is not concentric (asks Laras, changes the approved look); no skip link (header is short). Not verified: screen reader, forced-colors, 200% zoom, the Welcome hero at 375px after the font change.

**Not done yet:** P4b `design-critic` review (separate subagent). Other samples stay (Laras: leave them, they are gitignored).

**P4b critic review (24 Nov, `design-critic`, 26 URLs):** FAIL on 2 blockers before fixes. Fixed: Sign In now shows on phones; "Q-Day" and "ML-KEM-1024" no longer break across lines; headline in Title Case; padlock "failed" shows which step failed and a way forward; idle steps are numbered, not empty circles; Drill has one primary button first and hides the start buttons after the result; Item has a Download action and the not-proven warning sits above a blurred preview; file picker styled; no double "Add Someone"; saved toast links to the House.
**Still open (needs Laras):** (1) the brand font (Instrument Sans) is not applied: the running dev server sends `<html>` with no font class although `app/layout.tsx` has it; needs a dev-server restart (not done without Laras's yes). (2) In Today mode the Welcome headline sits on the roof on short screens; this is sample 02's exact look, so any change (picture move or a scrim) needs Laras's yes. Not verified: 1440px width, focus order, padlock Pending/Said-No states, house "updating".
Recheck of the fixes in Chrome: not done yet.

**Changes from chat qorechain-2026-04 (Laras checked them in the browser and is happy):**
1. Text-field hints are plain words, not `{placeholders}` (V16 rule 27): `/keys` ("Type your secret words in order", "Your first name"), `/house/add` ("Paste their address, starting with qor1"), `/put-in` ("Write anything you want to keep private").
2. Welcome readability (`components/hero.css`): new `--halo` token; the headline has a soft glow (cream by day, dark at night) and its top margin goes from 58u to 36u; "Stay Locked" is darker by day (42% to 72%); the caption is weight 500 with the same glow; `--soft` is stronger. This answers the open headline-on-roof item above.
3. New logo, "the turning core": three rounded squares turned 0°, 22.5° and 45° around a dot, drawn in `currentColor` (`components/Logo.tsx`). New tab icon `app/icon.svg`. The old `app/favicon.ico` is still there; ask Laras before removing it. The brand colour (lime) may change later; nothing is decided.
4. `components/Heading.tsx`: the intro paragraph runs the full width of the card on every inside page.
5. `/put-in`: "Choose a File" and "Or Write a Note" are stacked, not side by side.

**G4 passed (23 Nov, Laras):** every page checked and OK; Laras said `continue`. Recheck in Chrome (23 Nov): font now applied after a dev-server restart and a cleared `.next`; no sideways scroll at 375px on 16 route/state pages; Welcome headline is readable on the roof at 1366px. Old `app/favicon.ico` removed. Panel corners (16px) vs rows (12px): left as is, because the panel padding (20-24px) is bigger than its radius, so a perfectly nested corner would be about 0 and the difference is not visible. Sheet Esc/focus trap and toast dismiss stay for P6, when the real save and error flows exist.

**Sheet and Toast finished in P4 (23 Nov, Laras asked):** Sheet closes with Esc, moves focus inside, keeps Tab inside and returns focus to the opener. Toast has a × button. Checked in Chrome. Still P6: make the background inert and use a real `<dialog>` if needed.
