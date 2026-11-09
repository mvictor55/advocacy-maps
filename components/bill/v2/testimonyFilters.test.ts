import { Testimony } from "components/db"
import { Timestamp } from "firebase/firestore"
import {
  applyTestimonyFilters,
  groupLetters,
  isFiltered,
  isNearIdentical,
  parseTestimonyFilters
} from "./testimonyFilters"
import { queryForTab, tabForQuery } from "./useBillUrlState"

let n = 0
const letter = (
  over: Partial<Testimony> & { content: string; authorUid: string }
): Testimony =>
  ({
    id: `t${++n}`,
    billId: "H78",
    court: 194,
    position: "endorse",
    authorRole: "user",
    authorDisplayName: over.authorUid,
    fullName: over.authorUid,
    publishedAt: Timestamp.fromMillis(n * 1000),
    version: 1,
    ...over
  } as Testimony)

const FORM =
  "Dear members of the committee, I write in strong support of this bill. Consumer data privacy is overdue in the Commonwealth, and residents deserve the right to know what is collected about them, to correct it, and to delete it. Please report the bill favorably so the full House can vote on it this session. Thank you for your time and your service."

describe("parseTestimonyFilters", () => {
  it("reads known values and ignores the rest", () => {
    expect(
      parseTestimonyFilters({
        position: "oppose",
        role: "organization",
        sort: "oldest"
      })
    ).toEqual({ position: "oppose", role: "organization", sort: "oldest" })
    expect(
      parseTestimonyFilters({ position: "maybe", role: "robots" })
    ).toEqual({
      position: undefined,
      role: "all",
      sort: "newest"
    })
    expect(isFiltered(parseTestimonyFilters({ sort: "oldest" }))).toBe(false)
    expect(isFiltered(parseTestimonyFilters({ position: "neutral" }))).toBe(
      true
    )
  })

  it("opens the Testimony tab for a filter link, and drops filters on leaving it", () => {
    expect(tabForQuery({ position: "oppose" })).toBe("testimony")
    expect(tabForQuery({ position: "oppose", tab: "history" })).toBe("history")
    expect(tabForQuery({})).toBe("overview")
    expect(
      queryForTab({ position: "oppose", role: "user", page: "2" }, "history")
    ).toEqual({ page: "2", tab: "history" })
    expect(queryForTab({ position: "oppose", page: "2" }, "testimony")).toEqual(
      {
        position: "oppose",
        page: "2",
        tab: "testimony"
      }
    )
  })
})

describe("applyTestimonyFilters", () => {
  const items = [
    letter({ authorUid: "a", content: "one", position: "endorse" }),
    letter({
      authorUid: "b",
      content: "two",
      position: "oppose",
      authorRole: "organization"
    }),
    letter({ authorUid: "c", content: "three", position: "oppose" }),
    letter({ authorUid: "me", content: "mine", position: "neutral" })
  ]

  it("filters by position and author role", () => {
    expect(
      applyTestimonyFilters(items, {
        position: "oppose",
        role: "all",
        sort: "newest"
      }).map(t => t.authorUid)
    ).toEqual(["c", "b"])
    expect(
      applyTestimonyFilters(items, {
        role: "organization",
        sort: "newest"
      }).map(t => t.authorUid)
    ).toEqual(["b"])
    expect(
      applyTestimonyFilters(items, { role: "individual", sort: "oldest" }).map(
        t => t.authorUid
      )
    ).toEqual(["a", "c", "me"])
  })

  it("puts the reader's own testimony first whatever the sort", () => {
    expect(
      applyTestimonyFilters(items, { role: "all", sort: "oldest" }, "me").map(
        t => t.authorUid
      )
    ).toEqual(["me", "a", "b", "c"])
    expect(
      applyTestimonyFilters(items, { role: "all", sort: "newest" }, "me").map(
        t => t.authorUid
      )
    ).toEqual(["me", "c", "b", "a"])
  })
})

describe("groupLetters", () => {
  it("folds identical and near-identical letters and keeps one per author", () => {
    const items = [
      letter({ authorUid: "p1", content: FORM }),
      letter({ authorUid: "p2", content: FORM.replace("Thank you", "Thanks") }),
      letter({ authorUid: "p3", content: `<p>${FORM}</p>` }),
      letter({
        authorUid: "p1",
        content: "An earlier letter from the same person."
      }),
      letter({ authorUid: "q", content: "Something else entirely, and short." })
    ]
    const groups = groupLetters(items)
    expect(groups.map(g => g.representative.authorUid)).toEqual(["p1", "q"])
    expect(groups[0].members.map(m => m.authorUid)).toEqual(["p1", "p2", "p3"])
  })

  it("groups short letters only when identical", () => {
    expect(
      isNearIdentical("I support this bill.", "I support this bill!")
    ).toBe(true)
    expect(isNearIdentical("I support this bill.", "I oppose this bill.")).toBe(
      false
    )
    expect(isNearIdentical(FORM, FORM.slice(0, FORM.length / 2))).toBe(false)
  })
})
