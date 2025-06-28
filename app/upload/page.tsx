import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { FileUploader } from "@/components/upload/file-uploader"

export default async function UploadPage() {
  const { userId } = await auth()

  if (!userId) {
    redirect("/login")
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold">Upload Receipt</h1>
              <p className="text-muted-foreground mt-2">
                Upload a receipt to analyze its carbon footprint
              </p>
            </div>
            <FileUploader />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
