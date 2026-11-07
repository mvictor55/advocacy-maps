import { GetStaticProps } from "next"
import { ChallengePage } from "components/challenge/ChallengePage"
import { flags } from "components/featureFlags"
import { createPage } from "components/page"
import { createGetStaticTranslationProps } from "components/translations"

export default createPage({
  titleI18nKey: "titles.challenge",
  Page: () => <ChallengePage />
})

const getTranslationProps = createGetStaticTranslationProps([
  "auth",
  "common",
  "footer",
  "challenge"
])

export const getStaticProps: GetStaticProps = async context => {
  if (!flags().challengePage) return { notFound: true }
  return getTranslationProps(context)
}
