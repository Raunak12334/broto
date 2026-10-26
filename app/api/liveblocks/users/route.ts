import { auth, clerkClient } from "@clerk/nextjs/server"

export async function POST(request: Request) {
  // Require an authenticated user with an active organization
  const { userId, orgId } = await auth()

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!orgId) {
    return Response.json({ error: "Forbidden: no active organization" }, { status: 403 })
  }

  let userIds: string[]

  try {
    const body = await request.json()
    userIds = body.userIds

    if (!Array.isArray(userIds)) {
      return Response.json({ error: "userIds must be an array" }, { status: 400 })
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 })
  }

  if (userIds.length === 0) {
    return Response.json([])
  }

  // Fetch all requested users in a single batched call
  const client = await clerkClient()
  const { data: clerkUsers } = await client.users.getUserList({
    userId: userIds,
    limit: userIds.length,
  })

  // Build a lookup map keyed by Clerk user ID
  const userMap = new Map(
    clerkUsers.map((u) => [
      u.id,
      {
        name:
          u.fullName ??
          u.primaryEmailAddress?.emailAddress ??
          "Anonymous",
        avatar: u.imageUrl,
      },
    ])
  )


  const resolved = userIds.map((id) => userMap.get(id) ?? null)

  return Response.json(resolved)
}
