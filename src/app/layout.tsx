import { Inter } from 'next/font/google';
import '../styles/globals.css'
import '../styles/layout.css';
import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import {
  ClerkProvider,
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from '@clerk/nextjs'
import { Geist, Geist_Mono } from 'next/font/google'
import { ThemeProvider } from 'next-themes';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { UserSyncProvider } from '@/components/providers/user-sync-provider';
import { UploadThingProvider } from '@/lib/providers/uploadthing';
import { TopBar } from '@/components/ui/top-bar';

const inter = Inter({ subsets: ['latin'] });

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  metadataBase: new URL('https://emissionary.vercel.app'),
  title: 'Emissionary',
  description:
    'Emissionary is an app to detect your carbon emissions from your receipts. It uses data from your receipt to find your carbon emissions and compares your grocery carbon emissions with the average household.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className='dark' suppressHydrationWarning>
        <body className={inter.className}>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <UserSyncProvider>
              <UploadThingProvider>
                <div className="min-h-screen bg-background text-foreground">
              {/* Top bar with user button and theme toggle */}
                  <TopBar />
                  <main className="flex-1">{children}</main>
              </div>
              </UploadThingProvider>
            </UserSyncProvider>
          </ThemeProvider>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
