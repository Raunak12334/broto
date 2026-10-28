import { existsSync } from "node:fs"
import path from "node:path"
import toposort from "toposort"
import { logger, task } from "@trigger.dev/sdk"
import type { Stagehand, StagehandBrowser } from "@browserbasehq/stagehand"
import { nodeExecutors } from "@/features/workflows/nodes/node-executors"
import { getWorkflow } from "@/features/workflows/data"
import { interpolate } from "@/features/workflows/lib/interpolate"

// Ensure the extension archive path is set in the environment before Stagehand is loaded
if (!process.env.STAGEHAND_EXTENSION_ARCHIVE_PATH) {
    const defaultArchivePath = path.resolve(
        process.cwd(),
        "node_modules/@browserbasehq/stagehand/dist/assets/stagehand-extension.zip"
    )
    if (existsSync(defaultArchivePath)) {
        process.env.STAGEHAND_EXTENSION_ARCHIVE_PATH = defaultArchivePath
    }
}

// The Trigger.dev task the Run button fires. It loads the saved graph, works out
// what order the nodes should run in, and walks them. For now each node just
// announces itself — real execution (per-node executors, live progress, browser
// sessions) gets layered on from here.
export const runWorkflowTask = task({
    id: "run-workflow",
    run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
        const workflow = await getWorkflow(orgId, workflowId)
        if (!workflow?.graph) throw new Error(`Workflow ${workflowId} has no graph`)

        const { nodes, edges } = workflow.graph
        const byId = new Map(nodes.map((n) => [n.id, n]))

        // Run only connected nodes — anything touching an edge. Orphans dropped on
        // the canvas are skipped. toposort orders them and throws on a cycle.
        const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
        const order = toposort
            .array(
                nodes.map((n) => n.id),
                edges.map((e) => [e.source, e.target])
            )
            .filter((id) => connected.has(id))

        logger.log(`Running workflow ${workflow.name}`, { steps: order.length })

        // The run owns one Browserbase session, opened lazily on the first browser step
        // and reused by every later one, so the recording spans the whole flow. The
        // LLM routes through Browserbase's Model Gateway (BROWSERBASE_API_KEY), so no
        // separate provider key is needed.
        let browser: StagehandBrowser | undefined
        let stagehand: Stagehand | undefined
        const getStagehand = async (): Promise<Stagehand> => {
            if (stagehand) return stagehand

            // Dynamically import Stagehand after STAGEHAND_EXTENSION_ARCHIVE_PATH is set
            const { browserbase, Stagehand: StagehandClient } = await import("@browserbasehq/stagehand")

            browser = await browserbase.launch({
                apiKey: process.env.BROWSERBASE_API_KEY!,
                projectId: process.env.BROWSERBASE_PROJECT_ID,
            })

            stagehand = await StagehandClient.create({
                browser,
                model: {
                    modelName: "google/gemini-2.5-flash",
                },
            })

            return stagehand
        }

        const outputs: Record<string, unknown> = {}

        try {
            for (const id of order) {
                const node = byId.get(id)!
                logger.log(`Running step: ${node.data.title}`)

                const values: Record<string, string> = {}
                for (const [key, value] of Object.entries(node.data.values ?? {})) {
                    values[key] = interpolate(value, outputs)
                }

                // TODO: actually execute the node instead of just logging it, and report
                // its progress so the UI can watch the run live.
                const executor = nodeExecutors[node.data.type]
                if (executor) {
                    outputs[id] = await executor({ values, getStagehand })
                }
            }
        } finally {
            await stagehand?.close()
            await browser?.close()
        }

        return { steps: order.length, outputs }
    },
})
