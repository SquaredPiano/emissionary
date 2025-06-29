import { HomePage } from '@/components/home/home-page';
import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { MVPTestButton } from '@/components/mvp-test-button';

export default async function Home() {
  const { userId } = await auth();
  
  // Redirect authenticated users to dashboard
  if (userId) {
    redirect('/dashboard');
  }

  return (
    <div>
      <HomePage />
      <MVPTestButton />
    </div>
  );
}
