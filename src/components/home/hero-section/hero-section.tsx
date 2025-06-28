import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function HeroSection() {
  return (
    <section className={'mx-auto max-w-7xl px-[32px] relative flex items-center justify-between mt-16 mb-12'}>
      <div className={'text-center w-full '}>
        <h1 className={'text-[48px] leading-[48px] md:text-[80px] md:leading-[80px] tracking-[-1.6px] font-medium'}>
          Track your carbon.
          <br />
          <span className="text-green-600">Save our planet.</span>
        </h1>
        <p className={'mt-6 text-[18px] leading-[27px] md:text-[20px] md:leading-[30px] text-gray-600'}>
          AI-powered receipt scanning meets carbon footprint tracking. 
          <br />
          Understand your environmental impact and make better choices.
        </p>
        
        <div className="mt-8 flex gap-4 justify-center">
          <Link href="/signup">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
              Start Tracking Free
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
              Sign In
            </Button>
          </Link>
        </div>
        
        <div className="mt-12 flex justify-center">
          <div className="relative">
            <img 
              src="/hero.png" 
              alt="Emissionary Dashboard" 
              className="rounded-lg shadow-2xl border border-gray-200 max-w-4xl w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
