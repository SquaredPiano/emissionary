import { Suspense } from 'react';
import { DashboardLandingPage } from '@/components/dashboard/landing/dashboard-landing-page';
import { LoadingScreen } from '@/components/dashboard/layout/loading-screen';
import { getCurrentUser, getUserStats } from '@/lib/actions/users';
import { getUserReceipts, getUserEmissionsStats } from '@/lib/actions/receipts';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

// Helper function to safely serialize data
function safeSerialize(data: any): any {
  if (data === null || data === undefined) {
    return data;
  }
  
  // Handle primitives
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }
  
  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => safeSerialize(item));
  }
  
  // Handle objects
  if (typeof data === 'object') {
    // Handle special cases
    if (data instanceof Date) {
      return data.toISOString();
    }
    
    // Convert class instances to plain objects
    if (data.constructor !== Object) {
      const plainObject: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          try {
            const value = data[key];
            if (typeof value !== 'function') {
              plainObject[key] = safeSerialize(value);
            }
          } catch (error) {
            // Skip problematic properties
          }
        }
      }
      return plainObject;
    }
    
    // Handle plain objects
    const serialized: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value !== 'function') {
        serialized[key] = safeSerialize(value);
      }
    }
    
    return serialized;
  }
  
  return data;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ receipt?: string }>;
}) {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Await searchParams to fix Next.js dynamic API warning
  const resolvedSearchParams = await searchParams;

  // Fetch data in parallel
  const [userResult, statsResult, receiptsResult, emissionsResult] = await Promise.allSettled([
    getCurrentUser(),
    getUserStats(),
    getUserReceipts({ page: 1, limit: 5 }),
    getUserEmissionsStats()
  ]);

  // Extract data safely and serialize Prisma objects
  // For user, extract only the plain data and explicitly exclude clerkUser (which contains functions)
  let user = null;
  if (userResult.status === 'fulfilled' && userResult.value?.success && userResult.value.data) {
    const userData = userResult.value.data;
    // Only extract the database user fields, exclude clerkUser entirely
    user = safeSerialize({
      id: userData.id,
      clerkId: userData.clerkId,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
      avatar: userData.avatar,
      bio: userData.bio,
      location: userData.location,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt,
    });
  }
  
  // For stats, extract only the plain data
  let stats = null;
  if (statsResult.status === 'fulfilled' && statsResult.value?.success && statsResult.value.data) {
    const statsData = statsResult.value.data;
    stats = safeSerialize({
      total: statsData.total,
      weekly: statsData.weekly,
      monthly: statsData.monthly,
      count: statsData.count,
    });
  }

  // For receipts, extract only the plain data and serialize nested objects
  let receipts = null;
  if (receiptsResult.status === 'fulfilled' && receiptsResult.value?.success && receiptsResult.value.data) {
    const receiptsData = receiptsResult.value.data;
    receipts = safeSerialize({
      receipts: receiptsData.receipts?.map((receipt: any) => ({
        id: receipt.id,
        userId: receipt.userId,
        imageUrl: receipt.imageUrl,
        merchant: receipt.merchant,
        total: receipt.total,
        date: receipt.date,
        currency: receipt.currency,
        taxAmount: receipt.taxAmount,
        tipAmount: receipt.tipAmount,
        paymentMethod: receipt.paymentMethod,
        receiptNumber: receipt.receiptNumber,
        totalCarbonEmissions: receipt.totalCarbonEmissions,
        createdAt: receipt.createdAt,
        updatedAt: receipt.updatedAt,
        receiptItems: receipt.receiptItems?.map((item: any) => ({
          id: item.id,
          receiptId: item.receiptId,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
          category: item.category,
          brand: item.brand,
          barcode: item.barcode,
          description: item.description,
          carbonEmissions: item.carbonEmissions,
          confidence: item.confidence,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
        })) || [],
      })) || [],
      pagination: receiptsData.pagination,
    });
  }

  // For emissions, extract only the plain data
  let emissions = null;
  if (emissionsResult.status === 'fulfilled' && emissionsResult.value?.success && emissionsResult.value.data) {
    const emissionsData = emissionsResult.value.data;
    emissions = safeSerialize({
      totalEmissions: emissionsData.totalEmissions,
      totalReceipts: emissionsData.totalReceipts,
      thisWeekEmissions: emissionsData.thisWeekEmissions,
      weeklyAverage: emissionsData.weeklyAverage,
      fourWeekTotal: emissionsData.fourWeekTotal,
      monthlyData: emissionsData.monthlyData,
      weeklyData: emissionsData.weeklyData,
      categoryBreakdown: emissionsData.categoryBreakdown,
      averageEmissionsPerReceipt: emissionsData.averageEmissionsPerReceipt,
    });
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardLandingPage 
        user={user}
        stats={stats}
        receipts={receipts}
        emissions={emissions}
        highlightedReceiptId={resolvedSearchParams.receipt}
      />
    </Suspense>
  );
}
