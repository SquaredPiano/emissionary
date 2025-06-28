import { DashboardPageHeader } from '@/components/dashboard/layout/dashboard-page-header';
import { SimpleUpload } from '@/components/upload/simple-upload';
import { OCRStatus } from '@/components/upload/ocr-status';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';

export default async function UploadPage() {
  const { userId } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  return (
    <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-8">
      <DashboardPageHeader pageTitle="Upload Receipt" showBackButton={true} />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <SimpleUpload />
        <OCRStatus />
      </div>
    </main>
  );
} 