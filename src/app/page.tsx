import { HomePage } from '@/components/home/home-page';
import { auth } from '@clerk/nextjs/server';

export default async function Home() {
  try {
    const { userId } = await auth();
    return <HomePage user={userId ? { id: userId } : null} />;
  } catch {
    // If Clerk is not properly configured, just show the homepage without auth
    return <HomePage user={null} />;
  }
}
