import type { Stagehand } from "@browserbasehq/stagehand"

export async function observe({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const result = await stagehand.observe(instruction)
  const matches = result.data.map((action) => ({
    selector: action.selector,
    description: action.description,
  }))

  return {
    matches,
    selector: matches[0]?.selector ?? "",
    description: matches[0]?.description ?? "",
  }
}

