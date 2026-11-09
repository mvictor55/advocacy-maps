import { RollCall } from "components/bill/rollCalls"
import { External } from "components/links"
import { useTranslation } from "next-i18next"
import { Fragment } from "react"
import styled from "styled-components"
import { Muted } from "./SourceNote"
import { RESPONSES, RollCallVotes, useRollCallVotes } from "./useRollCallVotes"

const Groups = styled.dl`
  width: 100%;
  margin: var(--maple-space-sm) 0 0;
  font-size: 0.875rem;

  dt {
    font-weight: 600;
    color: var(--maple-text-body);
    margin-top: var(--maple-space-sm);
  }

  dd {
    margin: 0;
    color: var(--maple-text-body);
  }

  a {
    color: var(--maple-text-strong);
  }
`

/** The members' votes, grouped by response, as the record lists them. */
export function RollCallMembersView({
  rollCall,
  votes
}: {
  rollCall: RollCall
  votes: RollCallVotes
}) {
  const { t } = useTranslation("billPage")
  return (
    <div className="w-100">
      {!votes.complete && (
        <Muted className="small">
          {t("votes.members.incomplete", {
            yeas: votes.counted.yeas,
            tallyYeas: rollCall.yeas,
            nays: votes.counted.nays,
            tallyNays: rollCall.nays
          })}
        </Muted>
      )}
      {rollCall.quorum && (
        <Muted className="small">{t("votes.members.quorum")}</Muted>
      )}
      <Groups>
        {RESPONSES.filter(r => votes.byResponse[r].length > 0).map(r => (
          <Fragment key={r}>
            <dt>
              {t(`votes.members.${r.replace(" ", "")}`, {
                count: votes.byResponse[r].length
              })}
            </dt>
            <dd>
              {votes.byResponse[r].map((m, i) => (
                <Fragment key={m.memberCode}>
                  {i > 0 && ", "}
                  <External
                    href={`https://malegislature.gov/Legislators/Profile/${m.memberCode}`}
                  >
                    {m.name ?? m.memberCode}
                  </External>
                  {(m.party || m.district) && (
                    <span className="text-muted">
                      {" "}
                      ({[m.party, m.district].filter(Boolean).join(", ")})
                    </span>
                  )}
                </Fragment>
              ))}
            </dd>
          </Fragment>
        ))}
      </Groups>
      <Muted className="small mt-2">{t("votes.members.source")}</Muted>
    </div>
  )
}

/**
 * How each legislator voted, read behind the `billVotes` flag. When the
 * read fails or there is no data, nothing is shown and the tally stands
 * alone.
 */
export function RollCallMembers({
  court,
  billId,
  rollCall
}: {
  court: number
  billId: string
  rollCall: RollCall
}) {
  const { t } = useTranslation("billPage")
  const state = useRollCallVotes(court, billId, rollCall)
  if (state.status === "loading")
    return <Muted className="small w-100">{t("votes.members.loading")}</Muted>
  if (state.status === "unavailable") return null
  return <RollCallMembersView rollCall={rollCall} votes={state.votes} />
}
