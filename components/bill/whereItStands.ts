import { BillHistory } from "components/db"
import { isRollCall, parseRollCallLine, RollCall } from "./rollCalls"
import { oneLineActionText } from "./v2/actionText"
import { isChamberCommittee } from "./v2/documentKind"

/**
 * "Where it stands": the milestones a bill's text has reached and what is
 * true about it now, read from the Legislature's history lines with the
 * patterns in docs/bill-tracker-status-model.md §4. It is a reading of the
 * record, not a prediction: every milestone and status carries the line it
 * came from, for the tooltip.
 */

export type Branch = "House" | "Senate"

export const MILESTONES = [
  "filed",
  "inCommittee",
  "reportedOut",
  "passedFirst",
  "passedSecond",
  "toGovernor",
  "law"
] as const
export type MilestoneKey = (typeof MILESTONES)[number]

export type Milestone = {
  key: MilestoneKey
  reached: boolean
  /** The history line's date, as recorded. */
  date?: string | null
  /** The line the milestone was read from, as recorded. */
  action?: string
  branch?: string
  /** For `inCommittee`: the committee's name. */
  committee?: string
  /** For the two floor milestones: which branch. */
  passedBranch?: Branch
  /** Index of the line in the bill's history. */
  historyIndex?: number
  /** The roll call the Legislature cites on this line, if any. */
  rollCall?: RollCall
}

export type StatusKey =
  | "law"
  | "supersededBy"
  | "deadAtDissolution"
  | "sentToStudy"
  | "placedOnFile"
  | "adverseReport"
  | "vetoed"
  | "returnedWithAmendment"
  | "inConference"

export type Status = {
  key: StatusKey
  /** The line the status was read from, as recorded. */
  action: string
  date?: string | null
  /** `supersededBy`: the number the text continues under; `sentToStudy`:
   * the study order's number. */
  billId?: string
  /** `law`: "Chapter 20 of the Acts of 2026". */
  chapter?: string
  /** `law`: signed in part (budget item vetoes). */
  inPart?: boolean
}

export type WhereItStands = {
  /** The branch the bill started in. */
  origin: Branch
  milestones: Milestone[]
  /** The furthest milestone reached. */
  furthest: MilestoneKey
  status?: Status
}

const ADOPTED = /^adopted|read and adopted|order adopted|^report accepted/i

/** An Order's two steps: filed, then adopted (docs/bill-tracker-status-model.md §4.2). */
export function whereAnOrderStands(history: BillHistory): {
  adopted?: { date: string | null; action: string }
} {
  for (const h of history) {
    const text = clean(h.Action)
    if (ADOPTED.test(text)) return { adopted: { date: h.Date, action: text } }
  }
  return {}
}

const clean = (action: string) => oneLineActionText(action)

const REFERRAL =
  /(?:referred|discharged) to the (?:special joint )?committee on\s+(.+?)(?:,|$)/i
const REPORTED_OUT =
  /reported favorably|committee recommended ought to pass|^reported from the committee on|^new draft of|committee reported that the matter be placed/i
const ENGROSSED = /passed to be engrossed|and engrossed\b/i
const ENACTED = /^(?:re-)?enacted|^again enacted|^resolve passed/i
const LAID_BEFORE = /laid before the governor/i
const SIGNED =
  /signed(?: \(in part\))? by the (?:lieutenant )?governor|^chapter\s*\d+\s*of the (?:acts|resolves)/i
const CHAPTER = /chapter\s*(\d+)\s*of the (acts|resolves) of (\d{4})/i
const STUDY = /accompanied a study order(?:.*?see ([HS]\d+))?/i
const NEW_DRAFT_POINTER =
  /accompanied a new draft,?\s*see ([HS]\d+)|new draft substituted[^,]*,?\s*see ([HS]\d+)|amended by substitution of (?:a )?bill[^,]*,?\s*(?:see )?([HS]\d+)|published as amended,?\s*see ([HS]\d+)/i
const ADVERSE = /ought not to pass/i
const PLACED_ON_FILE = /^placed on file/i
const NFA = /^no further action taken/i
const CONFERENCE_APPOINTED =
  /committee of conference appointed|committee on conference .* appointed/i
const CONFERENCE_DONE = /conference report accepted|receded from its amendment/i
const VETO = /governor returned to the (?:house|senate) with vetoe?s?\b/i
const RETURNED_AMENDMENT =
  /governor returned to the (?:house|senate) with (?:recommendation of |an? )?amendment/i
const RETURN_RESOLVED =
  /governor'?s? amendment (?:adopted|rejected)|^re-enacted/i

export function whereItStands(
  history: BillHistory,
  billId: string
): WhereItStands {
  const lines = history.map((h, i) => ({
    text: clean(h.Action),
    date: h.Date,
    branch: h.Branch,
    index: i
  }))

  // The branch the bill started in: where it was first referred to a joint
  // committee; for a committee-created document, where its first action
  // was recorded; otherwise the branch its number says.
  const isBranch = (b: string | undefined): b is Branch =>
    b === "House" || b === "Senate"
  const firstJointReferral = lines.find(l => {
    const m = REFERRAL.exec(l.text)
    return m && !isChamberCommittee(m[1])
  })
  const firstLine = lines.find(l => isBranch(l.branch))
  const origin: Branch = isBranch(firstJointReferral?.branch)
    ? firstJointReferral.branch
    : isBranch(firstLine?.branch)
    ? firstLine.branch
    : billId.startsWith("S")
    ? "Senate"
    : "House"

  const reached = new Map<MilestoneKey, Milestone>()
  const set = (key: MilestoneKey, l: (typeof lines)[number], extra = {}) => {
    if (reached.has(key)) return
    const cited = parseRollCallLine(l.text, l.index, l.date, l.branch)
    reached.set(key, {
      key,
      reached: true,
      date: l.date,
      action: l.text,
      branch: l.branch,
      historyIndex: l.index,
      rollCall: cited && isRollCall(cited) && !cited.quorum ? cited : undefined,
      ...extra
    })
  }
  reached.set("filed", { key: "filed", reached: true })

  const enactedBy = new Set<string>()
  let status: Status | undefined
  const setStatus = (s: Status) => {
    status = s
  }
  let conference: Status | undefined
  let returned: Status | undefined

  for (const l of lines) {
    const t = l.text
    const referral = REFERRAL.exec(t)
    if (referral && !isChamberCommittee(referral[1]))
      set("inCommittee", l, { committee: referral[1].trim() })
    if (REPORTED_OUT.test(t) && !ADVERSE.test(t)) set("reportedOut", l)
    if (ENGROSSED.test(t) && (l.branch === "House" || l.branch === "Senate")) {
      const key: MilestoneKey =
        l.branch === origin ? "passedFirst" : "passedSecond"
      set(key, l, { passedBranch: l.branch })
    }
    if (ENACTED.test(t)) enactedBy.add(l.branch)
    if (LAID_BEFORE.test(t) || enactedBy.size === 2) set("toGovernor", l)
    if (SIGNED.test(t)) {
      set("law", l)
      const chapter = CHAPTER.exec(t)
      setStatus({
        key: "law",
        action: t,
        date: l.date,
        chapter: chapter
          ? `Chapter ${chapter[1]} of the ${
              chapter[2][0].toUpperCase() + chapter[2].slice(1).toLowerCase()
            } of ${chapter[3]}`
          : undefined,
        inPart: /\(in part\)/i.test(t)
      })
    }

    const pointer = NEW_DRAFT_POINTER.exec(t)
    if (pointer && status?.key !== "law")
      setStatus({
        key: "supersededBy",
        action: t,
        date: l.date,
        billId: (
          pointer[1] ??
          pointer[2] ??
          pointer[3] ??
          pointer[4]
        ).toUpperCase()
      })
    if (NFA.test(t) && status?.key !== "law")
      setStatus({ key: "deadAtDissolution", action: t, date: l.date })
    if (PLACED_ON_FILE.test(t) && !status)
      setStatus({ key: "placedOnFile", action: t, date: l.date })
    if (ADVERSE.test(t) && !status)
      setStatus({ key: "adverseReport", action: t, date: l.date })
    if (CONFERENCE_APPOINTED.test(t))
      conference = { key: "inConference", action: t, date: l.date }
    if (CONFERENCE_DONE.test(t)) conference = undefined
    if (VETO.test(t) && status?.key !== "law")
      setStatus({ key: "vetoed", action: t, date: l.date })
    if (RETURNED_AMENDMENT.test(t) && !VETO.test(t))
      returned = { key: "returnedWithAmendment", action: t, date: l.date }
    if (RETURN_RESOLVED.test(t)) returned = undefined
  }

  // "Sent to study" only when the study order is the last recorded action:
  // a later action means the bill came back.
  const last = lines[lines.length - 1]
  const study = last && STUDY.exec(last.text)
  if (study && status?.key !== "law" && status?.key !== "supersededBy")
    status = {
      key: "sentToStudy",
      action: last.text,
      date: last.date,
      billId: study[1]?.toUpperCase()
    }
  // An adverse report that was followed by more progress is not the status.
  if (
    status?.key === "adverseReport" &&
    (reached.has("passedFirst") || reached.has("reportedOut"))
  ) {
    const adverseIndex = lines.findIndex(l => ADVERSE.test(l.text))
    const later = [...reached.values()].some(
      m => (m.historyIndex ?? -1) > adverseIndex
    )
    if (later) status = undefined
  }
  if (!status && returned) status = returned
  if (!status && conference) status = conference

  const milestones: Milestone[] = MILESTONES.map(
    key => reached.get(key) ?? { key, reached: false }
  )
  const furthest =
    [...MILESTONES].reverse().find(k => reached.has(k)) ?? "filed"
  return { origin, milestones, furthest, status }
}

/** Which branch each floor milestone names, given the origin. */
export function floorBranch(
  key: "passedFirst" | "passedSecond",
  origin: Branch
): Branch {
  const other: Branch = origin === "House" ? "Senate" : "House"
  return key === "passedFirst" ? origin : other
}
