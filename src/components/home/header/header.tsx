import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';

interface DatabaseUser {
  id: string;
  clerkId: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatar: string | null;
  bio: string | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  user: DatabaseUser | null;
}

export default function Header({ user }: Props) {
  return (
    <nav className="w-full flex justify-end items-center gap-4 px-6 py-4 bg-transparent z-50">
      <ThemeToggle />
      {user?.id ? (
        <Button variant="secondary" asChild>
          <Link href="/dashboard">Dashboard</Link>
        </Button>
      ) : (
        <Button asChild variant="secondary">
          <Link href="/sign-in" className="text-black dark:text-white">Sign in</Link>
        </Button>
      )}
    </nav>
  );
}
