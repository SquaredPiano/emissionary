import Image from 'next/image';

export function BuiltUsingTools() {
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className="text-center text-sm font-medium mb-4 text-black dark:text-white">Built with</div>
      <div className="flex flex-row gap-12 items-center justify-center mb-4">
        <div className="flex flex-col items-center">
          <Image src="/assets/icons/logo/tailwind-logo.svg" alt="TailwindCSS logo" width={48} height={48} />
          <span className="text-xs mt-1 text-black dark:text-white">TailwindCSS</span>
        </div>
        <div className="flex flex-col items-center">
          <Image src="/assets/icons/logo/supabase-logo.svg" alt="Supabase logo" width={48} height={48} />
          <span className="text-xs mt-1 text-black dark:text-white">Supabase</span>
        </div>
        <div className="flex flex-col items-center">
          <Image src="/assets/icons/logo/nextjs-logo.svg" alt="Next.js logo" width={48} height={48} />
          <span className="text-xs mt-1 text-black dark:text-white">Next.js</span>
        </div>
        <div className="flex flex-col items-center">
          <Image src="/assets/icons/logo/shadcn-logo.svg" alt="Shadcn logo" width={48} height={48} />
          <span className="text-xs mt-1 text-black dark:text-white">Shadcn</span>
        </div>
      </div>
      <div className="text-center text-xs text-muted-foreground mt-4">Developed by Alexander He Meng (frontend) & Vishnu Sai (backend)</div>
    </div>
  );
}

export function Footer() {
  return <BuiltUsingTools />;
}
