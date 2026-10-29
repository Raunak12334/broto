import { auth } from "@clerk/nextjs/server"
import { notFound } from "next/navigation"
import { auth as triggerAuth } from "@trigger.dev/sdk"
import { Room } from "@/features/workflows/components/room"
import { WorkflowRunsProvider } from "@/features/workflows/components/workflow-runs-provider"
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
  if (!orgId) notFound()

  const workflow = await getWorkflow(orgId, id)

  if (!workflow) notFound()

  // Ensure the room exists and that the org has write access.
  // getOrCreateRoom is idempotent — safe to call on every page load.
  await liveblocks.getOrCreateRoom(id, {
    organizationId: orgId,
    defaultAccesses: [],
    groupsAccesses: {
      [orgId]: ["room:write"],
    },
  })

  // Mint a read-only public token scoped to this workflow's run tag, valid for 1 hour.
  const publicAccessToken = await triggerAuth.createPublicToken({
    scopes: {
      read: {
        tags: [`workflow:${id}`],
      },
    },
    expirationTime: "1h",
  })

  return (
    <Room roomId={id}>
      <WorkflowRunsProvider workflowId={id} publicAccessToken={publicAccessToken}>
        <WorkflowShell workflowId={id} />
      </WorkflowRunsProvider>
    </Room>
  )
}
