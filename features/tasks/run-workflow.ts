import toposort from "toposort";
import { logger, task } from "@trigger.dev/sdk";
import { getWorkflow } from "../workflows/data";

export const runWorkflowTask = task({
    id: "run-workflow",
    run: async ({ workflowId, orgId }: { workflowId: string; orgId: string }) => {
        const workflow = await getWorkflow(orgId, workflowId)
        if (!workflow?.graph) throw new Error(`Workflow has no graph ${workflowId}`)

        const { nodes, edges } = workflow.graph
        const byId = new Map(nodes.map(n => [n.id, n]))
        const connected = new Set(edges.flatMap((e) => [e.source, e.target]))
        const order = toposort
            .array(
                nodes.map((n) => n.id),
                edges.map((e) => [e.source, e.target])
            )
            .filter((id) => connected.has(id))

        logger.log(`Running workflow ${workflow.name}`, { steps: order.length })

        for (const id of order) {
            const node = byId.get(id)!
            logger.log(`Running step: ${node.data.title}`)
        }
        return { steps: order.length }
    },
})