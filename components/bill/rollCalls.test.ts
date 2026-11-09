import {
  parseRollCallLine,
  rollCallPdfUrl,
  rollCallsFromHistory,
  voteRollCalls
} from "./rollCalls"

// Lines copied from the dev database's bill histories (194th and 193rd).
const h = (Action: string, Branch: string, Date: string | null = null) => ({
  Action,
  Branch,
  Date
})

describe("parseRollCallLine", () => {
  it("reads the House form", () => {
    expect(
      parseRollCallLine(
        "Enacted - 151 YEAS to 0 NAYS (See YEA and NAY No. 270)",
        0,
        "2025-12-18T00:00:00"
      )
    ).toMatchObject({
      id: "house-270",
      branch: "House",
      number: 270,
      yeas: 151,
      nays: 0,
      question: "Enacted",
      quorum: false,
      supplement: false
    })
    expect(
      parseRollCallLine(
        "Amendment 18 rejected - 23 YEAS to 128 NAYS (See YEA and NAY No. 20)",
        0
      )
    ).toMatchObject({
      question: "Amendment 18 rejected",
      yeas: 23,
      nays: 128,
      number: 20
    })
    // A line break inside the tally.
    expect(
      parseRollCallLine(
        "Committee of conference report accepted - 142 YEAS to 6\r\nNAYS (See YEA and NAY No. 223)",
        0
      )
    ).toMatchObject({ yeas: 142, nays: 6, number: 223 })
    // The 193rd's variants.
    expect(
      parseRollCallLine(
        "Enacted - 157 YEAS to 0 NAYS (See YEA and NAY in Supplement, No. 86)",
        0
      )
    ).toMatchObject({ number: 86, supplement: true })
    expect(
      parseRollCallLine(
        "Passed to be engrossed - 152 YEAS to 2 NAYS (See YEA and NAY, No. 106)",
        0
      )
    ).toMatchObject({ number: 106, yeas: 152 })
  })

  it("reads the Senate forms", () => {
    expect(
      parseRollCallLine("Enacted -see Roll Call #207 (Yeas 39 to Nays 0)", 0)
    ).toMatchObject({
      id: "senate-207",
      branch: "Senate",
      number: 207,
      yeas: 39,
      nays: 0,
      question: "Enacted"
    })
    const variants: [string, number, number, number][] = [
      [
        "Passed to be engrossed -- see Roll Call #116 (Yeas 30 to Nays 7)",
        116,
        30,
        7
      ],
      [
        "Report accepted, as amended -see Roll Call #17 (Yeas 39 to Nay 0)",
        17,
        39,
        0
      ],
      [
        "Passed to be engrossed -see Roll Call # 97 (Yeas 37 to Nays 0)",
        97,
        37,
        0
      ],
      ["Enacted -see Roll Call #96 (Yeas 38 to to Nays 0)", 96, 38, 0],
      [
        "Committee of conference report accepted, in concurrence -see Roll Call #217 Yeas 38 to Nays 2)",
        217,
        38,
        2
      ],
      [
        "Reorganization plan approved -see Roll Call #17 (39 Yeas to 0 Nays)",
        17,
        39,
        0
      ],
      [
        "Enacted and laid before the Governor -see Roll Call #59  (Yeas 39 to Nays 0)",
        59,
        39,
        0
      ],
      [
        "Item 0330-0300 passed over veto -see Roll Call #75 (Yeas 35 to Nays 3)",
        75,
        35,
        3
      ]
    ]
    for (const [line, number, yeas, nays] of variants)
      expect(parseRollCallLine(line, 0)).toMatchObject({
        branch: "Senate",
        number,
        yeas,
        nays
      })
    expect(
      parseRollCallLine(
        "Item 0330-0300 passed over veto -see Roll Call #75 (Yeas 35 to Nays 3)",
        0
      )
    ).toMatchObject({ question: "Item 0330-0300 passed over veto" })
  })

  it("marks quorum calls and keeps unreadable citations raw", () => {
    expect(
      parseRollCallLine(
        "Quorum Roll Call - 149 YEAS to 0 NAYS (See YEA and NAY No. 249)",
        0
      )
    ).toMatchObject({ quorum: true, yeas: 149, number: 249 })
    // The one line in dev the parser can't read (S2565, 194th).
    expect(
      parseRollCallLine(
        "Passed to be engrossed -- see Roll Call #65 (Yeas 39 to Yeas 0)",
        4,
        null,
        "Senate"
      )
    ).toEqual({
      action: "Passed to be engrossed -- see Roll Call #65 (Yeas 39 to Yeas 0)",
      date: null,
      branch: "Senate",
      historyIndex: 4
    })
    expect(parseRollCallLine("Passed to be engrossed", 0)).toBeUndefined()
    // Voice and standing votes are not roll calls.
    expect(
      parseRollCallLine("Amendment #24 (Tarr) rejected (standing vote 5-10)", 0)
    ).toBeUndefined()
  })
})

describe("rollCallsFromHistory", () => {
  const history = [
    h("Read third and passed to be engrossed", "House"),
    h(
      "Enacted - 151 YEAS to 0 NAYS (See YEA and NAY No. 270)",
      "House",
      "2025-12-18T00:00:00"
    ),
    h(
      "Quorum Roll Call - 149 YEAS to 0 NAYS (See YEA and NAY No. 249)",
      "House"
    ),
    h(
      "Enacted -see Roll Call #207 (Yeas 39 to Nays 0)",
      "Senate",
      "2025-12-22T00:00:00"
    ),
    h(
      "Passed to be engrossed -- see Roll Call #65 (Yeas 39 to Yeas 0)",
      "Senate"
    )
  ]

  it("separates readable roll calls, quorum calls and unreadable lines", () => {
    const { rollCalls, unreadable } = rollCallsFromHistory(history)
    expect(rollCalls.map(r => r.id)).toEqual([
      "house-270",
      "house-249",
      "senate-207"
    ])
    expect(voteRollCalls(history).map(r => r.id)).toEqual([
      "house-270",
      "senate-207"
    ])
    expect(unreadable).toHaveLength(1)
    expect(unreadable[0].historyIndex).toBe(4)
  })

  it("links the official PDF except for the supplement series", () => {
    const [house, , senate] = rollCallsFromHistory(history).rollCalls
    expect(rollCallPdfUrl(194, house)).toBe(
      "https://malegislature.gov/RollCall/194/HouseRollCall270.pdf"
    )
    expect(rollCallPdfUrl(194, senate)).toBe(
      "https://malegislature.gov/RollCall/194/SenateRollCall207.pdf"
    )
    const supplement = parseRollCallLine(
      "Enacted - 157 YEAS to 0 NAYS (See YEA and NAY in Supplement, No. 86)",
      0
    )
    expect(rollCallPdfUrl(193, supplement as any)).toBeNull()
  })
})
