import type { Stagehand } from "@browserbasehq/stagehand"

export async function act({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const result = await stagehand.act(instruction)
  const [page] = await stagehand.browser.context.pages()
  const targetPage = (await stagehand.browser.context.activePage()) ?? page
  const url = targetPage ? await targetPage.url() : ""

  return {
    success: result.data.success,
    message: result.data.message,
    url,
  }
}

