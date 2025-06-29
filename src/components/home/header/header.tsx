import Link from 'next/link';
// import Image from 'next/image';
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
    <nav className="w-full flex justify-between items-center gap-4 px-6 py-4 bg-transparent z-50">
      <Link href="/" className="flex items-center gap-2 group">
        {/* <Image src="/assets/logo.svg" alt="Emissionary logo" width={40} height={40} className="drop-shadow-md transition-transform group-hover:scale-105" /> */}
        <span className="text-2xl font-bold bg-gradient-to-r from-green-400 via-lime-400 to-green-600 bg-clip-text text-transparent animate-gradient-x">Emissionary</span>
          </Link>
      <div className="flex items-center gap-4">
        <ThemeToggle />
            {user?.id ? (
          <Button variant="secondary" asChild>
            <Link href="/dashboard">Dashboard</Link>
              </Button>
            ) : (
          <Button asChild variant="secondary" className="bg-gradient-to-r from-green-400 via-lime-400 to-green-600 text-white dark:bg-[#fcfcfc33] dark:text-white border-none shadow-md">
            <Link href="/sign-in">Sign in</Link>
              </Button>
            )}
      </div>
    </nav>
  );
}
