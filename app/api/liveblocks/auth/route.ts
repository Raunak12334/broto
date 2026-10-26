import { auth, currentUser } from "@clerk/nextjs/server"
import { liveblocks } from "@/lib/liveblocks"

export async function POST() {
  const { userId, orgId } = await auth()

  if (!userId) {
    return new Response("Unauthorized", { status: 401 })
  }

  const user = await currentUser()

  const { status, body } = await liveblocks.identifyUser(
    {
      userId,
      // Pass the active org as a group so organization-scoped room permissions apply
      groupIds: orgId ? [orgId] : [],
    },
    {
      userInfo: {
        name:
          user?.fullName ??
          user?.primaryEmailAddress?.emailAddress ??
          "Anonymous",
        avatar: user?.imageUrl,
      },
    }
  )

  return new Response(body, { status })
}
