"use client"

import { useRef, useState, useTransition } from "react"
import { MoreHorizontal, Play, Trash2 } from "lucide-react"
import { useReactFlow, useStore } from "@xyflow/react"
import { toast } from "sonner"

import { deleteWorkflowAction, runWorkflowAction } from "@/features/workflows/actions"
import { validateGraph } from "../lib/validate-graph"
import { useUpstreamConnections } from "@/features/workflows/hooks/use-upstream-connections"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ResizablePanel } from "@/components/ui/resizable"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import {
  nodeRegistry,
  type NodeDefinition,
  type NodeField,
  type NodeType,
  type StepNodeKind,
  type StepNodeType,
} from "@/features/workflows/nodes/node-registry"

// This file builds up to the RightSidebar component exported at the bottom: a
// header with workflow actions (delete, run), then two tabs — a Toolbar for
// adding nodes and an Editor for tweaking the selected node. Each helper below is
// defined just above the block that uses it.

// ---------------------------------------------------------------------------
// Shared pieces — used by both the Toolbar and the Editor.
// ---------------------------------------------------------------------------

// The accent-colored icon chip, mirroring the node on the canvas.
export function NodeIcon({ type, className }: { type: NodeType; className?: string }) {
  const def = nodeRegistry[type]
  const Icon = def.icon
  return (
    <span
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-md",
        def.accent,
        className
      )}
    >
      <Icon className="size-3.5" />
    </span>
  )
}

// A titled, scrollable panel. Each tab renders its content inside one.
function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 border-y border-border bg-card px-3 py-1.5 text-sm font-semibold">
        {icon}
        {title}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Editor tab — edits the fields of the selected node.
// ---------------------------------------------------------------------------

// A single editor field for a node property.
// Renders a <Textarea> when field.multiline is true, otherwise a single-line <Input>.
function FieldInput({
  field,
  value,
  onChange,
  onFocus,
  onSelectChange,
}: {
  field: NodeField
  value: string
  onChange: (value: string) => void
  onFocus?: () => void
  onSelectChange?: (start: number, end: number) => void
}) {
  const updateSelection = (
    e: React.SyntheticEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const target = e.currentTarget
    onSelectChange?.(
      target.selectionStart ?? target.value.length,
      target.selectionEnd ?? target.value.length
    )
  }

  if (field.multiline) {
    return (
      <Textarea
        id={field.key}
        value={value}
        placeholder={field.placeholder}
        className="min-h-24 resize-y text-sm"
        onFocus={(e) => {
          onFocus?.()
          updateSelection(e)
        }}
        onSelect={updateSelection}
        onClick={updateSelection}
        onKeyUp={updateSelection}
        onChange={(e) => {
          onChange(e.target.value)
          updateSelection(e)
        }}
      />
    )
  }

  return (
    <Input
      id={field.key}
      value={value}
      placeholder={field.placeholder}
      onFocus={(e) => {
        onFocus?.()
        updateSelection(e)
      }}
      onSelect={updateSelection}
      onClick={updateSelection}
      onKeyUp={updateSelection}
      onChange={(e) => {
        onChange(e.target.value)
        updateSelection(e)
      }}
    />
  )
}

// The Editor tab: one input per field on the selected node, or an empty state.
function Inspector({ node }: { node: StepNodeType | undefined }) {
  const { updateNodeData } = useReactFlow<StepNodeType>()
  const upstreamConnections = useUpstreamConnections(node)

  const [lastFieldKey, setLastFieldKey] = useState<string | null>(null)
  const selectionRef = useRef<{ start: number; end: number } | null>(null)

  if (!node) {
    return (
      <Section title="Editor">
        <p className="p-3 text-sm text-muted-foreground">No node selected</p>
      </Section>
    )
  }

  const { type, title, values } = node.data
  const def: NodeDefinition = nodeRegistry[type]

  const handleInsert = (token: string) => {
    const targetKey =
      lastFieldKey && def.fields.some((f) => f.key === lastFieldKey)
        ? lastFieldKey
        : def.fields[0]?.key

    if (!targetKey) return

    const currentVal = values[targetKey] ?? ""
    const start = selectionRef.current?.start ?? currentVal.length
    const end = selectionRef.current?.end ?? currentVal.length

    const newVal = currentVal.slice(0, start) + token + currentVal.slice(end)
    const nextPos = start + token.length

    selectionRef.current = { start: nextPos, end: nextPos }
    setLastFieldKey(targetKey)

    updateNodeData(node.id, {
      values: { ...values, [targetKey]: newVal },
    })

    const el = document.getElementById(targetKey) as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null
    if (el) {
      el.focus()
      requestAnimationFrame(() => {
        el.setSelectionRange(nextPos, nextPos)
      })
    }
  }

  return (
    <Section title={title} icon={<NodeIcon type={type} />}>
      <div className="flex flex-col gap-3 p-3">
        {def.fields.length === 0 ? (
          <p className="text-xs text-muted-foreground">No properties</p>
        ) : (
          def.fields.map((field) => (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={field.key} className="text-xs">
                {field.label}
                {field.required && <span className="text-destructive">*</span>}
              </Label>
              <FieldInput
                field={field}
                value={values[field.key] ?? ""}
                onFocus={() => setLastFieldKey(field.key)}
                onSelectChange={(start, end) => {
                  setLastFieldKey(field.key)
                  selectionRef.current = { start, end }
                }}
                onChange={(value) => {
                  updateNodeData(node.id, {
                    values: { ...values, [field.key]: value },
                  })
                }}
              />
            </div>
          ))
        )}

        {upstreamConnections.length > 0 && (
          <div className="flex flex-col gap-2 pt-2 border-t border-border">
            <Label className="text-xs font-semibold text-muted-foreground">
              Connections
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {upstreamConnections.map((conn) => (
                <button
                  key={conn.token}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleInsert(conn.token)}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary/50 px-2 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-secondary cursor-pointer select-none"
                  title={`Insert ${conn.token}`}
                >
                  <NodeIcon
                    type={conn.type}
                    className="size-4 rounded-sm [&>svg]:size-2.5"
                  />
                  <span>{conn.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Toolbar tab — adds nodes to the canvas, grouped by kind.
// ---------------------------------------------------------------------------

// The Toolbar's groups, one accordion section per node kind.
const sections: { kind: StepNodeKind; label: string }[] = [
  { kind: "trigger", label: "Triggers" },
  { kind: "action", label: "Actions" },
]

// Every node type from the registry, filtered into the groups below.
const definitions = Object.values(nodeRegistry)

// The Toolbar tab: a button per node type that adds it to the canvas.
function Palette() {
  const { getNodes, addNodes, screenToFlowPosition } = useReactFlow()

  const add = (type: NodeType) => {
    const def = nodeRegistry[type]
    const existingNodes = getNodes() as StepNodeType[]

    // Enforce single-trigger rule.
    if (def.kind === "trigger") {
      const hasTrigger = existingNodes.some((n) => n.data.kind === "trigger")
      if (hasTrigger) {
        toast.error("Only one trigger allowed", {
          description: "Remove the existing trigger node before adding a new one.",
        })
        return
      }
    }

    // Count existing nodes of this type to build a numbered label.
    // Triggers are unique, so they don't need numbering.
    const sameTypeCount = existingNodes.filter(
      (n) => n.data.type === type
    ).length
    const title =
      sameTypeCount === 0
        ? def.label
        : `${def.label} ${sameTypeCount + 1}`

    // Place the node at the center of the current viewport.
    // The viewport (x, y, zoom) describes the transform applied to the canvas.
    // Inverting it gives us the flow-space coordinate of the screen center:
    //   flowX = (screenCenterX - viewport.x) / viewport.zoom
    //   flowY = (screenCenterY - viewport.y) / viewport.zoom
    // screenToFlowPosition does exactly this conversion.
    const screenCenterX = window.innerWidth / 2
    const screenCenterY = window.innerHeight / 2
    const position = screenToFlowPosition({ x: screenCenterX, y: screenCenterY })

    const newNode: StepNodeType = {
      id: crypto.randomUUID(),
      type: "step",
      position,
      data: { type, kind: def.kind, title, values: {} },
    }

    addNodes(newNode)
  }

  return (
    <Section title="Toolbar">
      <Accordion
        type="multiple"
        defaultValue={sections.map((s) => s.kind)}
        className="px-3 py-2"
      >
        {sections.map((section) => (
          <AccordionItem
            key={section.kind}
            value={section.kind}
            className="not-last:border-b-0"
          >
            <AccordionTrigger className="py-2 text-xs font-medium text-muted-foreground hover:no-underline">
              {section.label}
            </AccordionTrigger>
            <AccordionContent className="flex flex-col gap-0.5">
              {definitions
                .filter((def) => def.kind === section.kind)
                .map((def) => (
                  <Button
                    key={def.type}
                    variant="ghost"
                    onClick={() => add(def.type as NodeType)}
                    className="justify-start gap-2.5 px-1.5 text-xs"
                  >
                    <NodeIcon type={def.type as NodeType} />
                    {def.label}
                  </Button>
                ))}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </Section>
  )
}

// ---------------------------------------------------------------------------
// Header — workflow-level actions shown above the tabs.
// ---------------------------------------------------------------------------

// The "..." menu for workflow-level actions.
function ActionsMenu({ workflowId }: { workflowId: string }) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      try {
        await deleteWorkflowAction(workflowId)
      } catch {
        toast.error("Failed to delete workflow", {
          description: "Please try again.",
        })
      }
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost">
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-48">
        <DropdownMenuItem
          variant="destructive"
          disabled={isPending}
          className="text-xs [&_svg:not([class*='size-'])]:size-3.5"
          onSelect={(e) => {
            e.preventDefault()
            handleDelete()
          }}
        >
          <Trash2 />
          {isPending ? "Deleting…" : "Delete workflow"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// Kicks off a run of the current workflow.
function RunButton({ workflowId }: { workflowId: string }) {
  const { getNodes, getEdges } = useReactFlow<StepNodeType>()
  const [isPending, startTransition] = useTransition()
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={isPending}
      onClick={() => {
        // TODO: validate the graph and run the workflow (toggle to Stop while running).
        const graph = { nodes: getNodes(), edges: getEdges() }
        const problems = validateGraph(graph)

        if (problems.length > 0) {
          toast.error(problems[0])
          return
        }

        startTransition(async () => {
          await runWorkflowAction({ id: workflowId, graph })
        })
      }}
    >
      <Play fill="primary" />
      Run
    </Button>
  )
}

// ---------------------------------------------------------------------------
// The sidebar itself — header on top, then the Toolbar / Editor tabs.
// ---------------------------------------------------------------------------

export function RightSidebar({ workflowId }: { workflowId: string }) {
  const [tab, setTab] = useState("toolbar")

  // TODO: read the currently selected node from React Flow.
  const selected = useStore((s) => s.nodes.find((n) => n.selected)) as StepNodeType | undefined

  const [prevSelectedId, setPrevSelectedId] = useState(selected?.id)
  if (selected && selected.id !== prevSelectedId) {
    setPrevSelectedId(selected.id)
    setTab("editor")
  }

  return (
    <ResizablePanel
      className="bg-background"
      defaultSize="16rem"
      minSize="14rem"
      maxSize="36rem"
      groupResizeBehavior="preserve-pixel-size"
    >
      <Tabs value={tab} onValueChange={setTab} className="size-full gap-0">
        <div className="flex items-center justify-between border-b border-border p-2">
          <ActionsMenu workflowId={workflowId} />
          <RunButton workflowId={workflowId} />
        </div>
        <TabsList className="m-2 w-fit bg-background">
          <TabsTrigger
            value="toolbar"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Toolbar
          </TabsTrigger>
          <TabsTrigger
            value="editor"
            className="flex-none rounded-sm data-active:bg-accent! data-active:text-accent-foreground! data-active:shadow-none! dark:data-active:border-transparent!"
          >
            Editor
          </TabsTrigger>
        </TabsList>
        <TabsContent value="toolbar" className="flex min-h-0 flex-col">
          <Palette />
        </TabsContent>
        <TabsContent value="editor" className="flex min-h-0 flex-col">
          <Inspector key={selected?.id} node={selected} />
        </TabsContent>
      </Tabs>
    </ResizablePanel>
  )
}
