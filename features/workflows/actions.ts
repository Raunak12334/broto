"use server"

import { auth } from "@clerk/nextjs/server"
import { tasks } from "@trigger.dev/sdk"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

import type { helloWorldTask } from "@/trigger/example"

import { liveblocks } from "@/lib/liveblocks"
import { createWorkflow, deleteWorkflow } from "@/features/workflows/data"

export async function createWorkflowAction(name: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const workflow = await createWorkflow(orgId, name)

  revalidatePath("/", "layout")
  redirect(`/workflows/${workflow.id}`)
}

export async function deleteWorkflowAction(workflowId: string) {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  // Delete the DB row (scoped to the current org so cross-org deletes are blocked).
  await deleteWorkflow(orgId, workflowId)

  // Clean up the Liveblocks room. The room ID is the workflow ID.
  // Ignore 404s — the room may never have been created.
  try {
    await liveblocks.deleteRoom(workflowId)
  } catch {
    // Room may not exist yet; not a fatal error.
  }

  revalidatePath("/", "layout")
  redirect("/")
}

export async function runWorkflowAction() {
  const { orgId } = await auth()

  if (!orgId) {
    throw new Error("No active organization")
  }

  const handle = await tasks.trigger<typeof helloWorldTask>("hello-world", {
    message: "Hello from right-sidebar"
  })

  return handle
}
