"use server"

import { createClient } from "@/lib/supabase/server"
import prisma from "@/lib/prisma"
import { revalidatePath } from "next/cache"

export async function updateProfile(prevState: any, formData: FormData) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: "You must be logged in to update your profile." }
  }

  const fullName = formData.get("fullName") as string

  try {
    await prisma.profile.update({
      where: { id: user.id },
      data: {
        full_name: fullName,
      },
    })

    revalidatePath("/settings") // Re-renders the page with new data
    revalidatePath("/dashboard") // To update the user nav
    return { success: true }
  } catch (error) {
    console.error("Error updating profile:", error)
    return { error: "Could not update profile." }
  }
}
