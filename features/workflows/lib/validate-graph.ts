import toposort from 'toposort';
import type { WorkflowGraph } from '@/lib/db/schema';

export function validateGraph({ nodes, edges }: WorkflowGraph): string[] {
    const problems: string[] = []

    const triggers = nodes.filter((n) => n.data.kind === "trigger").length
    if (triggers !== 1) {
        problems.push(`Workflow must have exactly one trigger (found ${triggers}).`)
    }

    if (edges.length === 0) {
        problems.push("Workflow must have at least one edge.")
    } else {
        try {
            toposort(edges.map((e) => [e.source, e.target]))
        } catch {
            problems.push("Workflow contains a cycle.")
        }

    }

    return problems
}
