"use client"

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"
import type { runWorkflowTask, RunStep } from "@/features/tasks/run-workflow"

export type WorkflowRun = ReturnType<
  typeof useRealtimeRunsWithTag<typeof runWorkflowTask>
>["runs"][number]

export interface WorkflowRunsContextValue {
  runs: WorkflowRun[]
  latestRun: WorkflowRun | undefined
  error: Error | undefined
  steps: RunStep[]
  isLive: boolean
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

  const latestRun = useMemo(() => {
    if (!runs || runs.length === 0) return undefined
    return [...runs].sort((a, b) => {
      const timeDiff =
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      if (timeDiff !== 0) return timeDiff
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })[0]
  }, [runs])

  const rawOutputSteps = latestRun?.output?.steps
  const outputSteps = Array.isArray(rawOutputSteps)
    ? (rawOutputSteps as RunStep[])
    : undefined

  const rawMetadataSteps = latestRun?.metadata?.steps
  const metadataSteps = Array.isArray(rawMetadataSteps)
    ? (rawMetadataSteps as RunStep[])
    : undefined

  // Prefer final output steps; fall back to live metadata steps
  const steps: RunStep[] = useMemo(() => {
    return outputSteps ?? metadataSteps ?? []
  }, [outputSteps, metadataSteps])

  // "Live" means the run is queued or executing
  const isLive = Boolean(
    latestRun &&
      (latestRun.isQueued ||
        latestRun.isExecuting ||
        latestRun.status === "QUEUED" ||
        latestRun.status === "EXECUTING" ||
        latestRun.status === "DEQUEUED")
  )

  const value = useMemo<WorkflowRunsContextValue>(
    () => ({
      runs,
      latestRun,
      error,
      steps,
      isLive,
    }),
    [runs, latestRun, error, steps, isLive]
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
  const steps = context?.steps ?? []
  const isLive = context?.isLive ?? false
  const latestRun = context?.latestRun
  const error = context?.error

  return useMemo(() => {
    return Object.assign([steps, isLive] as [RunStep[], boolean], {
      steps,
      isLive,
      run: latestRun,
      error,
    })
  }, [steps, isLive, latestRun, error])
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
