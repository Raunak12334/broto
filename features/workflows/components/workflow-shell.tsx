import { ReactFlowProvider } from "@xyflow/react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"

import { Canvas } from "./canvas"
import { ConsolePanel } from "./console-panel"
import { RightSidebar } from "./right-sidebar"

interface WorkflowShellProps {
  workflowId: string
}

export function WorkflowShell({ workflowId }: WorkflowShellProps) {
  return (
    // ReactFlowProvider must wrap both Canvas and RightSidebar so they share
    // one React Flow store. Hooks like useReactFlow() and useViewport() inside
    // RightSidebar will then read/write the same state as the <ReactFlow>
    // element rendered inside Canvas.
    <ReactFlowProvider>
      <ResizablePanelGroup orientation="horizontal" className="size-full">
        <ResizablePanel minSize="30rem">
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel minSize="18rem">
              <Canvas />
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize="10rem" minSize="6rem">
              <ConsolePanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <ResizableHandle />
        <ResizablePanel defaultSize="16rem" minSize="14rem" maxSize="36rem">
          <RightSidebar workflowId={workflowId} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </ReactFlowProvider>
  )
}
