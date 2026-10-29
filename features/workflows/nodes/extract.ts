import type { Stagehand } from "@browserbasehq/stagehand"

export async function extract({
  stagehand,
  instruction,
}: {
  stagehand: Stagehand
  instruction: string
}) {
  const { data } = await stagehand.extract(instruction)

  return {
    result: data.extraction,
    extraction: data.extraction,
  }
}

