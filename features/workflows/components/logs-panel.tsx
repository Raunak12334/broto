"use client"

import prettyMs from "pretty-ms"
import { format } from "date-fns"
import {
  CheckCircle2,
  Clock,
  Play,
  Terminal,
  XCircle,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { Spinner } from "@/components/ui/spinner"
import { NodeIcon } from "@/features/workflows/components/right-sidebar"
import {
  useWorkflowRuns,
  type RunStep,
} from "@/features/workflows/components/workflow-runs-provider"

export interface SelectedStepInfo {
  runId: string
  step: RunStep
}

export interface LogsPanelProps {
  selectedStep?: SelectedStepInfo | null
  onToggleStep?: (runId: string, step: RunStep) => void
  className?: string
}

export function LogsPanel({
  selectedStep,
  onToggleStep,
  className,
}: LogsPanelProps) {
  const { runs } = useWorkflowRuns()

  if (!runs || runs.length === 0) {
    return (
      <div
        className={cn(
          "flex size-full flex-col items-center justify-center p-6 text-center text-muted-foreground",
          className
        )}
      >
        <Terminal className="mb-2 size-7 opacity-30" />
        <p className="text-xs font-medium">No workflow runs yet</p>
        <p className="text-[11px] text-muted-foreground/80">
          Run your workflow to inspect each execution and step.
        </p>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col gap-4 p-3", className)}>
      {runs.map((run, index) => {
        const isRunActive =
          run.isExecuting ||
          run.isQueued ||
          run.status === "EXECUTING" ||
          run.status === "QUEUED" ||
          run.status === "DEQUEUED"
        const isRunFailed =
          run.isFailed ||
          run.status === "FAILED" ||
          run.status === "CRASHED" ||
          run.status === "SYSTEM_FAILURE"
        const isRunCompleted =
          run.isCompleted || run.status === "COMPLETED"

        const runDuration =
          run.startedAt && run.finishedAt
            ? prettyMs(
                Math.max(
                  0,
                  new Date(run.finishedAt).getTime() -
                    new Date(run.startedAt).getTime()
                )
              )
            : null

        const runTimestamp = run.createdAt
          ? format(new Date(run.createdAt), "MMM d, h:mm:ss a")
          : ""

        return (
          <div
            key={run.id}
            className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-card/60 p-2.5"
          >
            {/* Run Header */}
            <div className="flex items-center justify-between gap-2 px-1 text-xs">
              <div className="flex items-center gap-2 font-medium">
                {isRunActive ? (
                  <Spinner className="size-3 text-blue-500 animate-spin" />
                ) : isRunFailed ? (
                  <XCircle className="size-3.5 text-destructive" />
                ) : isRunCompleted ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" />
                ) : (
                  <Play className="size-3.5 text-muted-foreground" />
                )}
                <span className="font-semibold text-foreground">
                  Run #{runs.length - index}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {run.id.slice(0, 10)}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                {runDuration && (
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="size-3" />
                    {runDuration}
                  </span>
                )}
                {runTimestamp && <span>{runTimestamp}</span>}
              </div>
            </div>

            {/* Run Steps */}
            {run.steps && run.steps.length > 0 ? (
              <div className="flex flex-col gap-1 pt-1">
                {run.steps.map((step) => {
                  const isSelected =
                    selectedStep?.runId === run.id &&
                    selectedStep?.step.id === step.id
                  const isRunning = step.status === "running"
                  const isFailed = step.status === "failed"
                  const isPending = step.status === "pending"
                  const isDone = step.status === "done"

                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => onToggleStep?.(run.id, step)}
                      className={cn(
                        "group flex w-full items-center gap-2.5 rounded-md border px-2.5 py-1.5 text-left text-xs transition-all",
                        // Inactive if it never ran
                        isPending &&
                          "border-border/40 bg-card/30 opacity-40 hover:opacity-75 text-muted-foreground",
                        // Done
                        isDone &&
                          "border-border/60 bg-card text-card-foreground hover:bg-accent/40",
                        // Running: spins while running
                        isRunning &&
                          "border-blue-500/50 bg-blue-500/5 text-foreground ring-1 ring-blue-500/30",
                        // Failed: turns red if failed
                        isFailed &&
                          "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15",
                        // Selected state
                        isSelected &&
                          "ring-2 ring-primary ring-offset-1 bg-accent/60"
                      )}
                    >
                      <NodeIcon
                        type={step.type}
                        className={cn(
                          "size-5 rounded",
                          isPending && "opacity-60 grayscale",
                          isFailed && "ring-1 ring-destructive/50"
                        )}
                      />

                      <span
                        className={cn(
                          "flex-1 truncate font-medium",
                          isFailed && "text-destructive",
                          isPending && "text-muted-foreground"
                        )}
                      >
                        {step.title}
                      </span>

                      <div className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                        {isRunning && (
                          <span className="flex items-center gap-1 font-medium text-blue-500">
                            <Spinner className="size-3 animate-spin" />
                            <span>Running</span>
                          </span>
                        )}
                        {isFailed && (
                          <span className="font-medium text-destructive">
                            Failed
                          </span>
                        )}
                        {step.durationMs !== undefined && (
                          <span
                            className={cn(
                              "font-mono",
                              isFailed && "text-destructive/80",
                              isRunning && "text-blue-500"
                            )}
                          >
                            {prettyMs(Math.max(0, step.durationMs))}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="px-2 py-1 text-[11px] italic text-muted-foreground">
                No steps executed yet.
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

