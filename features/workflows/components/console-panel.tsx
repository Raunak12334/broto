"use client"

import { useMemo, useState } from "react"
import prettyMs from "pretty-ms"
import { Clock, Terminal, X } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { NodeIcon } from "@/features/workflows/components/right-sidebar"
import {
  useWorkflowRuns,
  type RunStep,
} from "@/features/workflows/components/workflow-runs-provider"
import {
  LogsPanel,
  type SelectedStepInfo,
} from "@/features/workflows/components/logs-panel"

export function ConsolePanel() {
  const { runs, isLive } = useWorkflowRuns()
  const [selectedStep, setSelectedStep] = useState<SelectedStepInfo | null>(null)

  // Keep selectedStep in sync with any live updates in runs
  const activeSelectedStep = useMemo(() => {
    if (!selectedStep) return null
    const run = runs.find((r) => r.id === selectedStep.runId)
    if (!run) return selectedStep
    const freshStep = run.steps.find((s) => s.id === selectedStep.step.id)
    return freshStep
      ? { runId: selectedStep.runId, step: freshStep }
      : selectedStep
  }, [selectedStep, runs])

  const handleToggleStep = (runId: string, step: RunStep) => {
    setSelectedStep((prev) => {
      if (prev?.runId === runId && prev.step.id === step.id) {
        return null
      }
      return { runId, step }
    })
  }

  return (
    <div className="flex size-full flex-col overflow-hidden bg-background">
      {/* Top Console Header Bar */}
      <div className="flex h-8 shrink-0 items-center justify-between border-b border-border bg-muted/40 px-3 text-xs font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <Terminal className="size-3.5 text-foreground" />
          <span className="font-semibold text-foreground">Console</span>
          <span className="text-[11px] text-muted-foreground">
            ({runs.length} {runs.length === 1 ? "run" : "runs"})
          </span>
          {isLive && (
            <span className="flex items-center gap-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-500">
              <Spinner className="size-2.5 animate-spin" />
              Live
            </span>
          )}
        </div>

        {activeSelectedStep && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setSelectedStep(null)}
            className="h-5 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
          >
            Clear selection
          </Button>
        )}
      </div>

      {/* Main Content Area: LogsPanel + Step Details when selected */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto">
          <LogsPanel
            selectedStep={activeSelectedStep}
            onToggleStep={handleToggleStep}
          />
        </div>

        {activeSelectedStep && (
          <div className="flex w-72 md:w-80 shrink-0 flex-col border-l border-border bg-card">
            {/* Inspector Header */}
            <div className="flex h-8 shrink-0 items-center justify-between border-b border-border px-3">
              <div className="flex items-center gap-2 truncate">
                <NodeIcon
                  type={activeSelectedStep.step.type}
                  className="size-5 rounded"
                />
                <span className="truncate text-xs font-semibold">
                  {activeSelectedStep.step.title}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => setSelectedStep(null)}
                className="size-5 rounded hover:bg-muted"
                aria-label="Close details"
              >
                <X className="size-3.5" />
              </Button>
            </div>

            {/* Inspector Details Body */}
            <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 text-xs">
              {/* Status & Timing */}
              <div className="flex items-center justify-between rounded-md bg-muted/50 p-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground">Status:</span>
                  <span
                    className={cn(
                      "font-medium capitalize",
                      activeSelectedStep.step.status === "done" &&
                        "text-emerald-500",
                      activeSelectedStep.step.status === "failed" &&
                        "text-destructive",
                      activeSelectedStep.step.status === "running" &&
                        "text-blue-500",
                      activeSelectedStep.step.status === "pending" &&
                        "text-muted-foreground"
                    )}
                  >
                    {activeSelectedStep.step.status}
                  </span>
                </div>
                {activeSelectedStep.step.durationMs !== undefined && (
                  <div className="flex items-center gap-1 font-mono text-muted-foreground">
                    <Clock className="size-3" />
                    <span>
                      {prettyMs(
                        Math.max(0, activeSelectedStep.step.durationMs)
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Error view */}
              {activeSelectedStep.step.error && (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-destructive">Error</span>
                  <pre className="max-h-36 overflow-auto rounded-md border border-destructive/30 bg-destructive/10 p-2 font-mono text-[11px] text-destructive whitespace-pre-wrap">
                    {activeSelectedStep.step.error}
                  </pre>
                  {activeSelectedStep.step.stack && (
                    <details className="mt-1">
                      <summary className="cursor-pointer text-[10px] text-muted-foreground hover:text-foreground">
                        Stack trace
                      </summary>
                      <pre className="mt-1 max-h-28 overflow-auto rounded bg-muted p-1.5 font-mono text-[10px] text-muted-foreground whitespace-pre-wrap">
                        {activeSelectedStep.step.stack}
                      </pre>
                    </details>
                  )}
                </div>
              )}

              {/* Output view */}
              {activeSelectedStep.step.output !== undefined ? (
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-foreground">Output</span>
                  <pre className="max-h-48 overflow-auto rounded-md border border-border bg-muted/60 p-2 font-mono text-[11px] text-foreground">
                    {typeof activeSelectedStep.step.output === "string"
                      ? activeSelectedStep.step.output
                      : JSON.stringify(
                          activeSelectedStep.step.output,
                          null,
                          2
                        )}
                  </pre>
                </div>
              ) : activeSelectedStep.step.status === "done" ? (
                <div className="text-[11px] italic text-muted-foreground">
                  No output produced.
                </div>
              ) : null}

              {/* Pending / Running notes */}
              {activeSelectedStep.step.status === "pending" && (
                <div className="text-[11px] italic text-muted-foreground">
                  This step hasn&apos;t run yet.
                </div>
              )}
              {activeSelectedStep.step.status === "running" && (
                <div className="flex items-center gap-1.5 text-[11px] text-blue-500">
                  <Spinner className="size-3 animate-spin" />
                  <span>Step is currently running...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

