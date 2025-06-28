import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import prisma from "@/lib/prisma"
import { UserNav } from "@/components/dashboard/user-nav"
import { MobileNav } from "@/components/mobile-nav"
import { SettingsForm } from "@/components/settings/settings-form"

export default async function SettingsPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const profile = await prisma.profile.findUnique({
    where: { id: user.id },
  })

  if (!profile) {
    // This should not happen if signup is working correctly
    redirect("/login")
  }

  return (
    <div className="flex flex-col w-full">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
        <MobileNav />
        <div className="flex-1" />
        <UserNav />
      </header>
      <main className="flex-1 p-4 sm:px-6 sm:py-0">
        <h1 className="text-2xl font-semibold mb-4">Settings</h1>
        <div className="max-w-xl">
          <SettingsForm profile={profile} />
        </div>
      </main>
    </div>
  )
}
