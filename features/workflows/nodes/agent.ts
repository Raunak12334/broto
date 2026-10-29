import type { Stagehand } from "@browserbasehq/stagehand"

export async function agent({
  stagehand,
  instruction,
  maxSteps = 10,
}: {
  stagehand: Stagehand
  instruction: string
  maxSteps?: number
}) {
  let completed = false
  let summary = ""

  for (let step = 0; step < maxSteps; step++) {
    const { data: actions } = await stagehand.observe(instruction)

    if (!actions || actions.length === 0) {
      const { data } = await stagehand.extract(
        `Check if the goal "${instruction}" has been achieved. Reply with "COMPLETED: <summary>" if done, or "IN_PROGRESS: <summary>" if not done.`
      )
      completed = /^COMPLETED/i.test(data.extraction.trim())
      summary = data.extraction.replace(/^(COMPLETED|IN_PROGRESS):\s*/i, "").trim() || data.extraction
      break
    }

    await stagehand.act(actions[0])

    const { data } = await stagehand.extract(
      `Check if the goal "${instruction}" has been achieved. Reply with "COMPLETED: <summary>" if done, or "IN_PROGRESS: <summary>" if more steps are needed.`
    )

    const isStepCompleted = /^COMPLETED/i.test(data.extraction.trim())
    const stepSummary = data.extraction.replace(/^(COMPLETED|IN_PROGRESS):\s*/i, "").trim() || data.extraction

    if (isStepCompleted) {
      completed = true
      summary = stepSummary
      break
    } else {
      summary = stepSummary
    }
  }

  if (!completed && !summary) {
    summary = `Reached step limit of ${maxSteps} steps without completing the task.`
  }

  return {
    succeeded: completed,
    success: completed,
    message: summary || (completed ? "Task completed successfully." : "Task did not complete."),
    completed,
  }
}
