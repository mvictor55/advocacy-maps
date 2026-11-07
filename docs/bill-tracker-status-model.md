# Bill Tracker: status model and design spec

Status: draft for review. Replaces the logic in `functions/src/analysis/predictBillStatus.ts`
and the rendering in `components/bill/BillTracker.tsx`. Background research, with verbatim
action strings and bill numbers for every claim below, is in the "Massachusetts bill process
quirks" report that accompanied this spec.

## 1. Problem

The current tracker renders one green dot on a six-rung ladder
(`Bill Introduced → First Committee → Second Committee → First Chamber → Second Chamber →
Signed By Governor`) and picks the rung with a handful of regexes over the bill's history.
Measured on 699 random bills from the 193rd General Court:

- `/reported/i` is treated as a floor signal, so `Bill reported favorably by committee and
  referred to the committee on House Ways and Means` (and `Reporting date extended to ...`)
  puts a bill on "First Chamber". 240 bills were labelled First Chamber; 42 had a floor reading.
- There is no concept of a bill being dead or replaced. 94% of sampled bills died
  (43% sent to study, 24% stamped `No further action taken`, 13% replaced by a new draft,
  5% folded into a companion) and every one of them shows a green "current" dot.
- `/engrossed/i` cannot tell which branch engrossed, so "First/Second Chamber" is unreliable
  and never names the chamber.
- The joint-committee whitelist goes stale every session (e.g. "Agriculture" in the 193rd,
  "Aging and Independence" in the 194th are missing).

The root cause is that one dot is asked to carry two independent facts: how far the bill got,
and whether it is still alive.

## 2. Model: two layers

**Layer 1, progress.** The furthest milestone the bill's text has reached. Monotonic. Drives
the ladder.

**Layer 2, status.** What is true about the bill right now: active and waiting for X, stalled,
dead for reason Y, continues under another number, law. Drives the colour of the current dot,
a status line under the header, and "what happens next" copy.

A third fact sits alongside: **document chain**. Massachusetts records progress per document
number, not per bill. When a committee redrafts or a branch substitutes, the original number
freezes at a pointer (`Accompanied a new draft, see H4620`) and all later progress is logged
under the new number. The tracker must follow pointers and show the head of the chain.

### 2.1 Progress milestones

| Key | Display label | Reached when |
|---|---|---|
| `filed` | Filed | Always (the bill exists) |
| `inCommittee` | In committee | `Referred to the committee on <X>` where X is a joint committee; or `Reported from the committee on <X>` for committee-created documents |
| `reportedOut` | Reported out of committee | Any favourable report line (see §4.3), or the document is a new draft (`New draft of ...`) |
| `passedFirst` | Passed House / Passed Senate | `passed to be engrossed` or `and engrossed` logged by the originating branch |
| `passedSecond` | Passed Senate / Passed House | Same, logged by the other branch |
| `toGovernor` | Sent to Governor | Any line containing `laid before the Governor`, or `Enacted` logged by both branches, or `Resolve passed` by both |
| `law` | Signed into law | Governor signature, `Chapter N of the Acts of YYYY` after an override, or inferred law without signature |

Notes:

- Chamber committees (Ways and Means, Steering, Rules, Bills in the Third Reading, Health Care
  Financing when it is a second referral) do not get a rung. They are expressed in status
  (`inChamberCommittee`, naming the committee). Users read "reported out of committee, now in
  House Ways and Means" more easily than a second committee rung.
- "Enacted" is deliberately not user-facing: in Massachusetts it means final legislative
  passage, not law, and users read it as law.
- Conference committees, amendment ping-pong and Governor's amendment returns do not move the
  ladder. They are status.
- Labels for `passedFirst` / `passedSecond` are computed from `originBranch`.

### 2.2 Status enum

Each status carries `label`, `explanation`, `tone`, `terminal`, `inferred` and optional
structured `details`. Tone drives colour: `active` (green), `waiting` (amber), `dead` (grey),
`success` (green, filled ladder), `warning` (red).

| Key | Tone | Terminal | Label | Details |
|---|---|---|---|---|
| `awaitingHearing` | active | no | In committee, hearing not yet scheduled | committee |
| `hearingScheduled` | active | no | Hearing scheduled for {date} | committee, hearingDate |
| `awaitingReport` | active | no | Heard, awaiting committee report (due {date}) | committee, hearingDate, reportDueBy |
| `reportOverdue` | waiting | no | Past committee deadline, no report | committee, reportDueBy |
| `inChamberCommittee` | active | no | In {committee} | committee, branch |
| `onFloor` | active | no | Before the {branch} | branch |
| `awaitingConcurrence` | active | no | Passed both branches in different forms | branch holding it |
| `inConference` | waiting | no | In conference committee since {date} | appointedAt, reportBillId? |
| `awaitingGovernor` | active | no | On the Governor's desk since {date} (day N of 10) | laidBeforeAt |
| `returnedWithAmendment` | waiting | no | Returned by Governor with amendment | branch, messageBillId |
| `vetoed` | warning | no | Vetoed by the Governor | overridePossible |
| `informalOnly` | waiting | no | Formal sessions ended; can advance only by unanimous consent | — |
| `law` | success | yes | Signed into law, Chapter N of the Acts of YYYY | chapter, signedAt, inPart, viaOverride |
| `lawWithoutSignature` | success | yes | Became law without signature (inferred) | laidBeforeAt |
| `sentToStudy` | dead | yes* | Sent to study (presumed dead) | studyOrderId, date |
| `supersededBy` | dead | yes | Continues as {billId} | continuesAs, reason (newDraft, substituted, publishedAsAmended, companion) |
| `adverseReport` | dead | yes* | Reported "ought not to pass" | provisional (same-day recommit) |
| `placedOnFile` | dead | yes | Placed on file | — |
| `vetoSustained` | dead | yes | Vetoed; no override | — |
| `pocketVeto` | dead | yes | Pocket vetoed (inferred) | laidBeforeAt |
| `deadAtDissolution` | dead | yes | Died when the {N}th General Court ended | dissolvedAt, lastMilestone |

`*` Terminal unless a later non-stricken action appears on the same document. `sentToStudy`
flips back to active on any later action (`Discharged from committee and recommitted ...`,
`Bill reported favorably ...`); `adverseReport` is provisional when `Rules suspended` /
`Recommitted` follows on the same day.

`inferred: true` is set on `lawWithoutSignature`, `pocketVeto`, `reportOverdue`, and
`deadAtDissolution` when no `No further action taken` stamp exists. The UI shows "(inferred
from the calendar)" for these.

### 2.3 Document chain

```ts
chain: {
  /** Set on a frozen document. The number its text continues under. */
  continuesAs?: { billId: string; reason: "newDraft" | "substituted" | "publishedAsAmended" | "companion" | "conferenceReport"; action: string }
  /** Set on a successor. Numbers whose text this document absorbed. */
  replaces: string[]
}
```

Pointer grammar (all case-insensitive, whitespace-tolerant):

| Regex (on the frozen document) | reason |
|---|---|
| `accompanied a new draft,? see ([HS]\d+)` | newDraft |
| `new draft substituted[^,]*,? see ([HS]\d+)` | newDraft |
| `amended by substitution of (?:a )?bill[^,]*,? (?:see )?([HS]\d+)` | substituted |
| `published as amended,? see ([HS]\d+)` | publishedAsAmended |
| `^accompanied\s+([HS]\d+)` (no "by") | companion |
| `^see ([HS]\d+)$` (whole history is one line) | companion |
| `reported(?:, in part,)? by ([HS]\d+)` | conferenceReport (also sets `inConference.reportBillId`; the original is *not* frozen, since the report may be partial) |

Reverse pointers (on the successor): `new draft of ((?:[HS]\d+[, ]*(?:and )?)+)`,
`pending new draft of ([HS]\d+)`, `substituted for ([HS]\d+)`, `([HS]\d+), published as
amended`, `^accompanied by ((?:[HS]\d+[, ]*(?:and )?)+)`, `reported on (?:a part of )?([HS]\d+)`.

`Reprinted(,)? as amended(,)? see S2800` is an alias, not a supersession: the history
usually continues on the original. Record it as `aliases: ["S2800"]`, do not freeze.

Chains are followed at read time (§6), up to 6 hops, same court only. A cycle or a missing
successor document stops the walk and the UI shows what it has.

## 3. Firestore document

Path unchanged: `/billTracker/{court}-{billId}`. Shape:

```ts
type BillTracker = {
  id: string
  court: number
  /** Human override. Wins over prediction only while prediction.historyLength <= label.historyLength. */
  label?: { status: StatusKey; attribution: string; createdAt: Timestamp; historyLength: number }
  prediction?: {
    version: number           // bump on every classifier change; triggers recompute
    createdAt: Timestamp
    historyLength: number     // length of history used, for staleness checks
    legislationType: string   // from content.LegislationTypeName
    originBranch: "House" | "Senate"
    /** Layer 1. Index into the milestone order, plus when and by whom each was reached. */
    milestones: Partial<Record<MilestoneKey, { at: string | null; branch: Branch; actionIndex: number }>>
    furthest: MilestoneKey
    /** Layer 2, history-derived part only. Date-dependent parts are computed at read time. */
    facts: StatusFacts
    chain: { continuesAs?: ...; replaces: string[]; aliases: string[] }
  }
}
```

`StatusFacts` is everything the classifier can know without a clock: the raw terminal event if
any (`studyOrder`, `supersession`, `adverse`, `placedOnFile`, `nfaStamp`, `veto`,
`override`, `signed`), the current committee and branch, the last hearing's parsed date and
whether a later notice cancelled it, `laidBeforeGovernorAt`, `conferenceAppointedAt`,
`governorReturnedAt`, `extensionDeadline` (parsed from the last `Reporting date extended to
...` line), and `lastActionAt`.

The split matters: `deadAtDissolution`, `reportOverdue`, `awaitingReport (due ...)`,
`awaitingGovernor (day N of 10)`, `informalOnly`, `lawWithoutSignature` and `pocketVeto` all
depend on today's date. They are derived by a pure function `deriveStatus(prediction, now,
calendar)` that lives in `functions/src/analysis/` and is imported by both the Cloud Function
(for search/notification use) and the client (for display), so there is no nightly job and no
stale "active" bills after dissolution.

## 4. Classifier

`analyzeHistory(history: BillHistory, content: BillContent, court: number): Prediction`

### 4.1 Normalisation

For each action: drop rows with `IsStricken: true` (they are superseded hearing notices);
strip HTML tags; replace `\r\n` and `\n` with a space; collapse whitespace; trim. Match
case-insensitively. Never sort by `Date`: 15% of histories are non-monotonic and the array
order is the Clerk's canonical order. "Latest action" is the last non-stricken element.
`Date` may be null.

### 4.2 Gate on legislation type

| `LegislationTypeName` | Treatment |
|---|---|
| `Bill`, `Resolve` | Full ladder. Resolves use `Resolve passed` / `Resolve passed and laid before the Governor` / `Chapter N of the Resolves of YYYY` as their enactment and law vocabulary. |
| `Order`, `Extension Order` | Two-rung ladder: Filed → Adopted (`^adopted`, `read and adopted`, `order adopted`). Never reaches the Governor. Study orders themselves (`Title: "Study Order"`) get no tracker. |
| anything else (`Report`, `Amendment`, `Communication`, `Governor's Message (Veto)`, `Resolution`, proposals for constitutional amendment) | No tracker. `BillTrackerConnectedView` renders nothing. |

### 4.3 Origin branch and committee structure

`originBranch` = `Branch` of the first `Referred to the committee on` (or, for committee-created
documents, the first `Reported from the committee on`) line; fall back to the bill number
prefix (H/S).

Committee classification is structural, not a whitelist. Given `the committee on <X>`:

- chamber committee if X starts with `House ` or `Senate `, or X is `Rules of the two branches,
  acting concurrently`, `Bills in the Third Reading`, `Joint Rules`, or `Rules`;
- joint second-tier committee (treated like a chamber committee for status, i.e. does not
  re-enter `inCommittee`) if X is `Health Care Financing` or `Bonding, Capital Expenditures and
  State Assets` **and** the bill has already reached `reportedOut`;
- otherwise a joint policy committee.

The committee code prefix (`J`/`H`/`S`) from `bill.currentCommittee` can confirm this when
present.

### 4.4 Milestone extraction

Walk actions in array order. For each line, find the furthest-advanced keyword it contains
(compound lines like `Read, rules suspended, read second, ordered to a third reading, read
third and passed to be engrossed` carry several) and record it with the line's `Branch`:

```
precedence (low → high):
  referred to the committee on                      → inCommittee (joint) / chamber committee (status)
  reported favorably | committee recommended ought to pass |
  reported from the committee on | new draft of |
  committee reported that the matter be placed       → reportedOut
  placed in the orders of the day                    → onFloor (status only)
  read second | ordered to (a|the|ta) third reading  → onFloor
  read third                                         → onFloor
  passed to be engrossed | and engrossed             → passedFirst if Branch == originBranch else passedSecond
  concurred in the .* amendment |
  conference report accepted                         → (status: concurrence resolved)
  emergency preamble adopted                         → (ignore)
  ^(re-)?enacted | ^resolve passed |
  ^again enacted                                     → enacted[Branch]
  laid before the governor                           → toGovernor
  signed by the .*chapter | ^chapter \d+ of the (acts|resolves) |
  signed \(in part\) by the governor                 → law
```

Guards:

- `passedSecond` requires `passedFirst` already set (a second-branch arrival line `Read; and
  placed in the Orders of the Day` carries no passage keyword, so this is only a safety check).
- `toGovernor` via `Enacted` requires enactment from both branches; `laid before the Governor`
  alone is sufficient (the Senate always logs it).
- `law` requires `toGovernor`.
- A bare `Senate concurred` / `House concurred` is referral bookkeeping. Only `concurred in the
  (Senate|House) (further )?amendment` and `, in concurrence` suffixes are passage-related.
- `Rules suspended`, `Taken out of the Orders of the Day`, `Order relative to subject matter
  adopted`, amendment adopted/rejected lines, roll-call suffixes and `(title changed)` are noise.
- `Referred to the committee on Bills in the Third Reading` after an engrossment means
  "considering the other branch's amendment", not a step backwards.
- The second-branch arrival line begins `Read;` or `Read,` from the non-origin branch; it marks
  `onFloor` or `inChamberCommittee` for that branch (`Read; and referred to the committee on
  House Ways and Means`).

### 4.5 Terminal and status events

Scanned on every line, last match wins unless noted:

| Event | Regex | Effect |
|---|---|---|
| studyOrder | `accompanied a study order` (with optional `\(under (JR10\|House Rule 27)\)`, partial `sections .* accompanied a study order`, and the interim `will accompany a study order`) | `sentToStudy` if this is the last non-stricken action; `studyOrderId` from `see ([HS]\d+)` |
| supersession | pointer grammar, §2.3 | `supersededBy`, freezes the document |
| adverse | `ought not to pass` | `adverseReport`; `provisional` if a `rules suspended` or `recommitted` line follows on the same date |
| placedOnFile | `^placed on file` | `placedOnFile` (only when not a constitutional proposal; those are gated out) |
| rejected | `^rejected$` | `adverseReport` |
| nfa | `^no further action taken` | `deadAtDissolution` with `dissolvedAt` = the line's date |
| hearing | `hearing (scheduled for\|rescheduled to) (\d{2}/\d{2}/\d{4})`, `location changed - hearing scheduled for ...`, `hearing canceled` | `hearingDate` from the text (not from `Date`); `canceled` clears it |
| extension | `report(?:ing\|ed) date extended to (.+?)(?:, pending concurrence)?$`, `amendment \(changing reporting date to (.+?)\) adopted` | `extensionDeadline`, parsed from many formats (`Tuesday April 30, 2024`, `Wednesday, March 18, 2026`, `July 31st`) |
| conference | `committee of conference appointed`, `committee on conference .* appointed` | `conferenceAppointedAt` (first), cleared by `conference report accepted` or `receded from its amendment` |
| governorReturn | `governor returned to the (house\|senate) with (recommendation of \|an? )?amendment` | `returnedWithAmendment` until `governor'?s? amendment (adopted\|rejected)` and a `re-enacted` line |
| veto | `governor returned to the (house\|senate) with vetoes?` | `vetoed`; `overridden` on `passed over veto` from both branches; a budget `Item \d+-\d+ passed over veto` is recorded per item, `Signed (in part)` keeps the main bill at `law` with `inPart: true` |
| signed | `signed by the (governor\|lieutenant governor\|),? chapter\s*\d*\s*of the (acts\|resolves) of \d{4}`, `signed \(in part\) by the governor`, `^chapter \d+ of the acts of \d{4}` (post-override law) | `law`; chapter parsed when present. Tolerates the malformed `Signed by the , Chapter  of the Acts of 2024`. |

`sentToStudy` is only terminal if it is the last non-stricken action. Any later action
(`Discharged from committee and recommitted ...`, `Reported from the committee on House Rules`,
`Bill reported favorably ...`) returns the bill to the active status implied by that action.

### 4.6 Date-dependent derivation (`deriveStatus`)

Inputs: `prediction`, `now`, and the court calendar (§5). Rules, in order:

1. Terminal event present → that status (`law`, `supersededBy`, `sentToStudy`, `adverseReport`
   non-provisional, `placedOnFile`, `deadAtDissolution` from an NFA stamp).
2. `now > calendar.dissolution` and not law → `deadAtDissolution` (inferred) for anything else,
   except: `laidBeforeGovernorAt` within 10 days of dissolution and no signature →
   `pocketVeto` (inferred); `laidBeforeGovernorAt` more than 10 days before dissolution and no
   signature → `lawWithoutSignature` (inferred).
3. `laidBeforeGovernorAt` set, no Governor action → `awaitingGovernor` with `day = daysBetween`;
   if `day > 10` → `lawWithoutSignature` (inferred).
4. `vetoed` and `now > calendar.formalEndYear2` and court not in a permitted formal exception →
   `vetoSustained` (inferred, low confidence; the 2025 rules allow override sessions after
   July 31).
5. `conferenceAppointedAt` set, no report → `inConference`.
6. `returnedWithAmendment` pending → that.
7. Furthest milestone is `passedSecond` with unresolved amendment → `awaitingConcurrence`;
   `passedFirst` → `onFloor`/`inChamberCommittee` for the other branch per last arrival line.
8. Furthest milestone `reportedOut` → `inChamberCommittee` (committee from the last
   `referred to the committee on <chamber committee>`) or `onFloor`.
9. Furthest milestone `inCommittee`:
   - hearing date in the future → `hearingScheduled`;
   - hearing date past (or none) and `reportDueBy` (§5.2) in the future → `awaitingReport`
     (or `awaitingHearing` if no hearing has ever been scheduled);
   - `reportDueBy` past → `reportOverdue` (inferred). Under 194th rules this means a study
     order is expected.
10. Any non-terminal status while `now > calendar.formalEndYear2` → add the `informalOnly`
    modifier (shown as a secondary line, not a replacement status), unless the bill is in one
    of the Joint Rule 12A exceptions (in conference formed before July 31; vetoed; returned
    with amendment; an appropriation bill).

### 4.7 Label precedence

A human `label` wins over the prediction only while the history has not grown since the label
was set (`prediction.historyLength <= label.historyLength`). Once new actions arrive the
prediction wins and the UI shows a small "previously labelled {status} by {attribution}" note
in the admin view only.

## 5. Court calendar

### 5.1 Constants

`functions/src/analysis/calendar.ts`, one entry per court:

```ts
type CourtCalendar = {
  court: number
  convene: string              // first Wednesday of January, odd year
  filingDeadline: string       // JR 12, third Friday in January
  jr10Default: string          // committee reporting deadline
  jr10Rule: "adverse" | "study" // consequence of missing it
  houseRule27?: { daysAfterHearing: 60; chairExtension: 30; cap: string }  // 194th onward
  healthCareFinancing: string
  formalEndYear1: string
  formalEndYear2: string       // July 31 of even year
  dissolution: string          // day before first Wednesday of January; NFA stamp date
}
```

| | 192nd | 193rd | 194th | 195th (computed) |
|---|---|---|---|---|
| convene | 2021-01-06 | 2023-01-04 | 2025-01-01 | 2027-01-06 |
| jr10Default | 2022-02-02 (adverse) | 2024-02-07 (adverse) | 2025-12-03 (study) | 2027-12-01 (study) |
| houseRule27 cap | — | — | 2026-03-18 | 2028-03-15 |
| healthCareFinancing | 2022-03-23 | 2024-03-27 | 2026-01-28 | 2028-01-26 |
| formalEndYear2 | 2022-07-31 | 2024-07-31 | 2026-07-31 | 2028-07-31 |
| dissolution | 2023-01-03 | 2024-12-31 | 2027-01-05 | 2029-01-02 |

Pre-194th courts default to the 193rd shape with computed dates. Unknown court → no
date-dependent statuses, history-derived only.

### 5.2 Report deadline for a bill in committee

```
if extensionDeadline:            reportDueBy = extensionDeadline
elif court >= 194 and originBranch == House and hearingDate:
                                 reportDueBy = min(hearingDate + 60d, houseRule27.cap)
elif committee is Health Care Financing: reportDueBy = healthCareFinancing
elif court >= 194 and referredAt >= Oct 1 of year 1:
                                 reportDueBy = referredAt + 60d
else:                            reportDueBy = jr10Default
```

## 6. UI

Component stays a `MapleCard` titled "Bill Tracker" in `BillDetails`, behind the existing
`billTracker` feature flag until the acceptance criteria in §8 are met.

### 6.1 Layout

```
Bill Tracker
┌─────────────────────────────────────────────────────┐
│ ● Filed                         Feb 16, 2023        │
│ ● In committee                  Feb 16, 2023        │
│   Judiciary · Hearing held Oct 10, 2023             │
│ ● Reported out of committee     Feb 22, 2024        │
│ ○ Passed Senate                                     │
│ ○ Passed House                                      │
│ ○ Sent to Governor                                  │
│ ○ Signed into law                                   │
├─────────────────────────────────────────────────────┤
│ ■ Died when the 193rd General Court ended           │
│   Last in Senate Ways and Means. Dec 31, 2024.      │
└─────────────────────────────────────────────────────┘
```

Rules:

- Reached rungs: filled dot, date from `milestones[key].at` (formatted `MMM d, yyyy`; omitted if
  null). Unreached: hollow dot, no date.
- The furthest rung's dot takes the status tone colour: green for `active`/`success`, amber for
  `waiting`, grey for `dead`, red for `warning`. The connecting line is coloured only between
  reached rungs. Today the line is always green and every label is bold; both are bugs.
- The furthest rung's label is bold; other labels are regular weight.
- One line of secondary text under the furthest rung carries the most specific detail: committee
  name, hearing date, "due {date}", chamber committee, "day N of 10".
- The status footer shows `label`, then `explanation` in smaller text. Inferred statuses append
  "(inferred from the legislative calendar)".
- `passedFirst`/`passedSecond` labels are "Passed House"/"Passed Senate" ordered by origin.
- Orders render a two-rung ladder. Documents with no tracker render nothing (not an empty card).

### 6.2 Superseded documents

When `chain.continuesAs` is set, the card shows a banner at the top:

> This bill's text continues as **H4620** (new draft reported by the committee on Housing).
> Showing H4620's progress.

and renders the ladder of the chain head (resolved client-side by loading
`/billTracker/{court}-{continuesAs}` repeatedly, max 6 hops). The frozen bill's own milestones
are not shown; its page still shows its own history table. If the head cannot be loaded,
render the frozen bill's own ladder with the `supersededBy` footer.

A successor shows a quiet line under the header: "Replaces S725, S728 and 24 other bills"
(expandable).

### 6.3 Status copy

English strings live in `public/locales/en/common.json` under `bill.tracker.*`. Dates and
bill numbers are interpolated. The explanation strings should use the vocabulary Massachusetts
reporters use: "sent to study", "reported out", "Ways and Means", "passed the House", "signed
into law". Avoid "engrossed" and "enacted" in user-facing text; use them only in a tooltip on
the history table.

| Status | Explanation (draft) |
|---|---|
| `sentToStudy` | The committee sent this bill to a study order on {date}. Study orders are how most Massachusetts bills end; a bill can be pulled back out, but most are not. |
| `supersededBy` | On {date} the committee reported a new version under a new number. Progress is now recorded on {billId}. |
| `deadAtDissolution` | The {ordinal} General Court ended on {date} with this bill still pending. Bills do not carry over; it would need to be refiled. |
| `reportOverdue` | The committee's deadline to report this bill was {date}. Under current rules, unreported bills are sent to study. |
| `awaitingGovernor` | The Governor has ten days to sign, veto, or return the bill with amendments. Day {n} of 10. |
| `lawWithoutSignature` | More than ten days passed without a signature or veto, so the bill became law without one. Not yet confirmed in the official record. |
| `inConference` | The House and Senate passed different versions. A conference committee has been negotiating since {date}. |
| `informalOnly` (modifier) | Formal sessions ended {date}. Bills can still pass in informal sessions, but a single objection blocks them. |

### 6.4 Related fix

`components/bill/Status.tsx` labels the last action "Hearing Held" when the *posting* date of
the notice is in the past, which is almost always the next day. It should use the hearing date
parsed from the action text (the same helper as §4.5) and, where `bill.hearingIds` exists,
prefer the hearing document's `Status == "Completed"`.

## 7. Pipeline

- `updateBillTracker` (`onDocumentWritten` on bills) stays. It recomputes when `history`
  changes or `prediction.version` differs. It now also recomputes when `content.LegislationTypeName`
  changes (a docket becomes a bill) and writes `null` (deletes the tracker) for gated-out types.
- `predictBillStatus` is replaced by `analyzeHistory`, which must not mutate its input.
- `currentTrackerVersion` is bumped to 2. A one-off `yarn firebase-admin run-script
  touchBills` over all courts triggers the recompute; expect roughly 20k documents.
- `deriveStatus` runs on the client at render time. It is also exposed to the search converter
  (`functions/src/bills/search.ts`) so bills can be filtered by status later, but that is out of
  scope for this change.
- Chain resolution at read time means a frozen document's displayed state updates whenever its
  successor's tracker updates, with no fan-out writes.

## 8. Testing and acceptance

Fixtures are real API histories, fetched once with court and bill number and committed under
`tests/fixtures/billHistories/{court}/{billId}.json`. The table maps each to the branch of the
classifier it exercises; the expected `furthest`, `facts` terminal event and `continuesAs` are
asserted, and `deriveStatus` is asserted at two or three fixed `now` values each.

| Fixture | Exercises |
|---|---|
| 193 H4003 | House origin, full path, silent Bills in Third Reading, `House concurred in the Senate amendment`, signed |
| 194 S23 | Senate origin, `(title changed)`, House Steering, signing dated before enactment |
| 193 H25 | Same-day emergency law, late-file Rules compound line |
| 193 H100, 193 H105, 193 S2065 | Ways and Means / HCF stall → `No further action taken` |
| 193 H200, 193 S500 | Study order terminal, no NFA stamp |
| 194 S2907, 194 S2157 | Study revival with and without a discharge line |
| 193 S736 → H4620 → H4746 | 26-bill merged new draft, second redraft, chain resolution |
| 193 H4291 → H4557 | Floor substitution, `Substituted for` |
| 193 H2 → H4600 → H4601 → S4/S2800 → H4800 | Budget chain, `Published as amended`, `Reprinted as amended` alias, `Signed (in part)`, item overrides |
| 193 H1882 / S1170, 193 S1236 | `Accompanied X` vs `Accompanied by X`, `Accompaied` typo |
| 193 H3770 / H4104, 193 H4804 / H5100 | Conference silence, report under new number, post-July-31 formal session |
| 193 H4986, 193 S816, 193 H4251 | `Ought NOT to pass` rescued same day vs stuck; explicit adverse + `Placed on file` |
| 193 S1000, 193 H1306, 194 H4144 | Stacked extensions, abandoned extension typo, 194th House extension |
| 192 H4805, 191 H5179, 192 H4008 | Veto, `Passed over veto`, bare `Chapter N of the Acts`, amendment rejected → vetoed → overridden |
| 193 H3911, 193 S2933 | Governor's amendment adopted and re-enacted; Senate-side return that died |
| 192 H4899, 192 H5232 | Pocket veto inference; signing dated after dissolution |
| 193 S2995, 193 H54 | Resolve vocabulary; Order vocabulary |
| 193 H1171, 194 H100, 193 H4920, 194 H5311, 193 H1314 | `IsStricken` hearings, padding, malformed signing line, embedded newline, out-of-order dates |
| 194 H2572 | null `Date` |

Distribution test: run the classifier over the 699-bill random sample from the 193rd (kept
under `tests/fixtures/billHistories/193-sample.json`) and assert terminal-state shares are within
5 points of the observed 43% study / 24% NFA / 13% new draft / 5% companion / 6% law, and that
no bill is `onFloor` or beyond without a `read second|read third|passed to be engrossed` line.

Un-skip `tests/integration/billTracker.test.ts`; fix the "detects second chamber" test, which
currently asserts the second-committee fixture.

Acceptance before removing the feature flag: every fixture passes; a manual review of 30 random
194th bills against malegislature.gov finds no wrong terminal state and no ladder rung beyond
what the history supports; the `/bills/{id}` page renders the card without layout shift on
mobile.

## 9. Out of scope

- Predicting likelihood of passage (GovTrack-style prognosis).
- Cross-session linking ("this was H1234 in the 193rd"), which the API only exposes via
  `/Similar`.
- Filtering or sorting bill lists by status.
- Notifying users on status change (the existing notification pipeline keys on history, which
  is unchanged).

## 10. Open questions

1. Whether Sundays count toward the Governor's ten days is unresolved in the sources. The spec
   uses calendar days and marks the result inferred.
2. No verbatim action string exists for law-without-signature or pocket veto. If the Clerk's
   office ever logs one, add it to §4.5 and drop the inference.
3. Should `informalOnly` be a modifier (current spec) or a status in its own right? Modifier
   keeps the primary status truthful ("in Ways and Means") while warning about odds.
4. Whether to show the `label` vs `prediction` disagreement to non-admin users. Spec says no.
