import { useMemo } from "react"
import { getIncomers, useEdges, useNodes, type Node } from "@xyflow/react"
import toposort from "toposort"
import {
  nodeRegistry,
  type NodeType,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

export type UpstreamConnection = {
  token: string
  label: string
  type: NodeType
}

export type UpstreamOutput = UpstreamConnection

/**
 * Hook that takes the currently selected node (or reads the selected node from React Flow)
 * and returns every output produced by any node upstream of it.
 *
 * Traverses incoming connections all the way back up the graph, re-computing whenever
 * edges are connected or disconnected.
 */
export function useUpstreamConnections(
  selected?: StepNodeType | Node | { id: string } | string | null
): UpstreamConnection[] {
  const nodes = useNodes<StepNodeType>()
  const edges = useEdges()

  const selectedId =
    typeof selected === "string"
      ? selected
      : selected !== undefined
        ? selected?.id
        : nodes.find((n) => n.selected)?.id

  return useMemo(() => {
    if (!selectedId) return []

    const nodeMap = new Map<string, StepNodeType>(nodes.map((n) => [n.id, n]))
    const upstreamNodeIds = new Set<string>()
    const visited = new Set<string>([selectedId])
    const queue: { id: string }[] = [{ id: selectedId }]

    while (queue.length > 0) {
      const current = queue.shift()!
      const incomers = getIncomers(current, nodes, edges) as StepNodeType[]

      for (const incomer of incomers) {
        if (!visited.has(incomer.id)) {
          visited.add(incomer.id)
          upstreamNodeIds.add(incomer.id)
          queue.push({ id: incomer.id })
        }
      }
    }

    if (upstreamNodeIds.size === 0) return []

    // Order upstream nodes topologically so earlier nodes appear first.
    // Fall back to reversed traversal order if the graph has a cycle.
    let orderedNodes: StepNodeType[] = []
    try {
      const upstreamEdges = edges.filter(
        (e) => upstreamNodeIds.has(e.source) && upstreamNodeIds.has(e.target)
      )
      const sortedIds = toposort.array(
        Array.from(upstreamNodeIds),
        upstreamEdges.map((e) => [e.source, e.target])
      )
      orderedNodes = sortedIds
        .map((id) => nodeMap.get(id))
        .filter((n): n is StepNodeType => Boolean(n))
    } catch {
      orderedNodes = Array.from(upstreamNodeIds)
        .reverse()
        .map((id) => nodeMap.get(id))
        .filter((n): n is StepNodeType => Boolean(n))
    }

    const outputs: UpstreamConnection[] = []
    for (const node of orderedNodes) {
      const def = nodeRegistry[node.data.type]
      if (!def?.outputs || def.outputs.length === 0) continue

      const nodeTitle = node.data.title || def.label || node.data.type

      for (const output of def.outputs) {
        outputs.push({
          token: `{{ ${node.id}.${output.path} }}`,
          label: `${nodeTitle} · ${output.label}`,
          type: node.data.type,
        })
      }
    }

    return outputs
  }, [edges, nodes, selectedId])
}

