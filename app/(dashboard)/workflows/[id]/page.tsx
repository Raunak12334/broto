import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { Room } from "@/features/workflows/components/room"
import { WorkflowShell } from "@/features/workflows/components/workflow-shell"
import { getWorkflow } from "@/features/workflows/data"
import { liveblocks } from "@/lib/liveblocks"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { orgId } = await auth()
  if (!orgId) notFound();

  const workflow = await getWorkflow(orgId, id)

  if (!workflow) notFound()

  // Ensure the room exists and that the org has write access.
  // getOrCreateRoom is idempotent — safe to call on every page load.
  await liveblocks.getOrCreateRoom(id, {
    defaultAccesses: [],
    groupsAccesses: {
      [orgId]: ["room:write"],
    },
  })

  return (
    <Room roomId={id}>
      <WorkflowShell workflowId={id} />
    </Room>
  )
}
