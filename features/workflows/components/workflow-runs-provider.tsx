"use client"

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"
import type { runWorkflowTask, RunStep } from "@/features/tasks/run-workflow"

export type { RunStep } from "@/features/tasks/run-workflow"

export type RawWorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

export type WorkflowRun = RawWorkflowRun & {
  steps: RunStep[]
}

/**
 * Extracts and normalizes the RunStep list from a run, inspecting final output
 * first and falling back to live metadata.
 */
export function getRunSteps(
  run: RawWorkflowRun | WorkflowRun | undefined | null
): RunStep[] {
  if (!run) return []

  const rawOutputSteps =
    run.output && typeof run.output === "object" && "steps" in run.output
      ? (run.output as { steps?: unknown }).steps
      : undefined
  const outputSteps = Array.isArray(rawOutputSteps)
    ? (rawOutputSteps as RunStep[])
    : undefined

  const rawMetadataSteps =
    run.metadata && typeof run.metadata === "object" && "steps" in run.metadata
      ? (run.metadata as { steps?: unknown }).steps
      : undefined
  const metadataSteps = Array.isArray(rawMetadataSteps)
    ? (rawMetadataSteps as RunStep[])
    : undefined

  // Prefer final output steps; fall back to live metadata steps
  return outputSteps ?? metadataSteps ?? []
}

export interface WorkflowRunsContextValue {
  runs: WorkflowRun[]
  latestRun: WorkflowRun | undefined
  error: Error | undefined
  steps: RunStep[]
  isLive: boolean
  getRunSteps: (run: RawWorkflowRun | WorkflowRun | undefined | null) => RunStep[]
  getRun: (runId: string) => WorkflowRun | undefined
}

const WorkflowRunsContext = createContext<WorkflowRunsContextValue | null>(null)

export interface WorkflowRunsProviderProps {
  workflowId: string
  publicAccessToken?: string
  accessToken?: string
  children: ReactNode
}

export function WorkflowRunsProvider({
  workflowId,
  publicAccessToken,
  accessToken,
  children,
}: WorkflowRunsProviderProps) {
  const token = publicAccessToken ?? accessToken

  const { runs = [], error } = useRealtimeRunsWithTag<typeof runWorkflowTask>(
    `workflow:${workflowId}`,
    {
      accessToken: token,
      enabled: Boolean(token && workflowId),
    }
  )

  const enrichedRuns = useMemo<WorkflowRun[]>(() => {
    if (!runs || runs.length === 0) return []

    // Sort runs chronologically (newest first)
    const sorted = [...runs].sort((a, b) => {
      const timeDiff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (timeDiff !== 0) return timeDiff
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })

    return sorted.map((run) => {
      const steps = getRunSteps(run)
      return Object.assign(run, { steps })
    })
  }, [runs])

  const latestRun = enrichedRuns[0]

  // Steps for the latest run (or empty array if no runs)
  const steps: RunStep[] = useMemo(() => {
    return latestRun?.steps ?? []
  }, [latestRun])

  // "Live" means the run is queued or executing
  const isLive = Boolean(
    latestRun &&
      (latestRun.isQueued ||
        latestRun.isExecuting ||
        latestRun.status === "QUEUED" ||
        latestRun.status === "EXECUTING" ||
        latestRun.status === "DEQUEUED")
  )

  const getRun = useMemo(() => {
    return (runId: string) => enrichedRuns.find((r) => r.id === runId)
  }, [enrichedRuns])

  const value = useMemo<WorkflowRunsContextValue>(
    () => ({
      runs: enrichedRuns,
      latestRun,
      error,
      steps,
      isLive,
      getRunSteps,
      getRun,
    }),
    [enrichedRuns, latestRun, error, steps, isLive, getRun]
  )

  return (
    <WorkflowRunsContext.Provider value={value}>
      {children}
    </WorkflowRunsContext.Provider>
  )
}

export type LatestRunSteps = [RunStep[], boolean] & {
  steps: RunStep[]
  isLive: boolean
  run: WorkflowRun | undefined
  error: Error | undefined
}

export function useLatestRunSteps(): LatestRunSteps {
  const context = useContext(WorkflowRunsContext)

  return useMemo(() => {
    const steps = context?.steps ?? []
    const isLive = context?.isLive ?? false
    const latestRun = context?.latestRun
    const error = context?.error

    return Object.assign([steps, isLive] as [RunStep[], boolean], {
      steps,
      isLive,
      run: latestRun,
      error,
    })
  }, [context?.steps, context?.isLive, context?.latestRun, context?.error])
}

export function useWorkflowRuns(): WorkflowRunsContextValue {
  const context = useContext(WorkflowRunsContext)
  if (!context) {
    throw new Error(
      "useWorkflowRuns must be used within a WorkflowRunsProvider."
    )
  }
  return context
}

export function useWorkflowRun(runId?: string): WorkflowRun | undefined {
  const { runs } = useWorkflowRuns()
  return useMemo(() => {
    if (!runId) return undefined
    return runs.find((r) => r.id === runId)
  }, [runs, runId])
}
