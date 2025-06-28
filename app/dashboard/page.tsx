import { auth, currentUser } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { KpiWidgets } from "@/components/dashboard/kpi-widgets"
import { EmissionsChart } from "@/components/dashboard/emissions-chart"
import { CategoryPieChart } from "@/components/dashboard/category-pie-chart"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { ActionableTips } from "@/components/dashboard/actionable-tips"
import { ComparativeMetrics } from "@/components/dashboard/comparative-metrics"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"

export default async function DashboardPage() {
  const { userId } = await auth()
  const user = await currentUser()

  if (!userId) {
    redirect("/login")
  }

  // Mock data for now - in real app, this would come from your database
  const mockEmissionsData = [
    { date: "Jan", emissions: 45.2 },
    { date: "Feb", emissions: 52.1 },
    { date: "Mar", emissions: 39.8 },
    { date: "Apr", emissions: 43.6 },
    { date: "May", emissions: 38.2 },
    { date: "Jun", emissions: 41.9 },
  ]

  const mockCategoryData = [
    { category: "Food", _sum: { emissions: 125.4 } },
    { category: "Transport", _sum: { emissions: 89.2 } },
    { category: "Energy", _sum: { emissions: 76.8 } },
    { category: "Shopping", _sum: { emissions: 34.5 } },
  ]

  const mockRecentReceipts = [
    {
      id: "1",
      store_name: "Whole Foods Market",
      total_emissions: 15.2,
      created_at: new Date("2024-12-01"),
      status: "processed"
    },
    {
      id: "2", 
      store_name: "Target",
      total_emissions: 8.7,
      created_at: new Date("2024-11-30"),
      status: "processed"
    },
    {
      id: "3",
      store_name: "Safeway",
      total_emissions: 12.1,
      created_at: new Date("2024-11-29"),
      status: "processed"
    },
  ]

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Welcome back, {user?.firstName || 'there'}!</h1>
              <p className="text-muted-foreground">Here's your carbon footprint overview</p>
            </div>
          </div>

          <KpiWidgets
            totalEmissionsMonth={245.6}
            totalEmissionsWeek={58.3}
            receiptsThisMonth={12}
            avgDailyEmissions={8.2}
          />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <EmissionsChart data={mockEmissionsData} />
            <CategoryPieChart data={mockCategoryData} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RecentActivity receipts={mockRecentReceipts} />
            <ActionableTips />
          </div>

          <ComparativeMetrics
            userEmissions={245.6}
            avgEmissions={312.4}
            userImprovement={-15.2}
          />
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
