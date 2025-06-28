import { Inter } from 'next/font/google';
import '../styles/globals.css';
import '../styles/layout.css';
import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { ClerkProvider } from '@clerk/nextjs'

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Emissionary - Track Your Carbon Footprint',
  description: 'AI-powered receipt scanning meets carbon footprint tracking. Understand your environmental impact and make better choices for our planet.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={'min-h-full dark'}>
        <body className={inter.className}>
          {children}
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
