import { Button } from '@/components/ui/button';
import { Leaf, Camera, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className="mx-auto max-w-7xl px-[32px] relative flex items-center justify-between mt-16 mb-12 overflow-visible">
      {/* Animated green gradient background, larger and centered */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[80vh] -z-10 animate-gradient bg-gradient-to-tr from-green-400 via-lime-300 to-green-600 opacity-60 blur-3xl rounded-full" />
      <div className={'text-center w-full'}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Leaf className="h-8 w-8 text-green-400 drop-shadow-glow animate-pulse" />
          <span className="text-2xl font-bold bg-gradient-to-r from-green-400 via-lime-400 to-green-600 bg-clip-text text-transparent animate-gradient-x">Emissionary</span>
        </div>
        <h1 className="text-[48px] leading-[1.1] md:text-[80px] md:leading-[1.1] tracking-[-1.6px] font-extrabold mb-6 bg-gradient-to-r from-green-400 via-lime-400 to-green-600 bg-clip-text text-transparent animate-gradient-x">
          Snap your receipt.<br />
          <span className="block animate-shimmer bg-gradient-to-r from-green-400 via-lime-400 to-green-600 bg-clip-text text-transparent">See your footprint.</span><br />
          Cut your emissions.
        </h1>
        <p className="mt-6 text-[18px] leading-[27px] md:text-[20px] md:leading-[30px] text-black dark:text-white/80 max-w-3xl mx-auto mb-8 drop-shadow-lg">
          Upload your grocery receipts and instantly see your carbon footprint. 
          Get personalized tips to reduce your environmental impact and track your progress over time.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link href="/sign-up">
            <Button size="lg" className="bg-gradient-to-r from-green-400 via-lime-400 to-green-600 hover:from-green-500 hover:to-green-700 text-white px-8 py-3 text-lg shadow-xl transition-transform transform hover:scale-105">
              <Camera className="h-5 w-5 mr-2 animate-glow text-white" />
              Start Tracking
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg border-2 border-green-400 text-green-300 hover:bg-green-400/10 transition-transform transform hover:scale-105">
              <TrendingDown className="h-5 w-5 mr-2 animate-glow text-green-300" />
              View Demo
            </Button>
          </Link>
        </div>
        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-green-400/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-glow">
              <Camera className="h-8 w-8 text-green-400 animate-pulse" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Snap & Upload</h3>
            <p className="text-sm text-white/80">Take a photo of your receipt and upload it instantly</p>
          </div>
          <div className="text-center">
            <div className="bg-lime-300/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-glow">
              <Leaf className="h-8 w-8 text-lime-400 animate-pulse" />
            </div>
            <h3 className="font-semibold mb-2 text-white">AI Analysis</h3>
            <p className="text-sm text-white/80">Our AI extracts items and calculates carbon emissions</p>
          </div>
          <div className="text-center">
            <div className="bg-green-600/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg animate-glow">
              <TrendingDown className="h-8 w-8 text-green-600 animate-pulse" />
            </div>
            <h3 className="font-semibold mb-2 text-white">Track Progress</h3>
            <p className="text-sm text-white/80">Monitor your emissions and get personalized tips</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Add the following to your global CSS for custom animations:
// .animate-gradient { background-size: 200% 200%; animation: gradientMove 8s ease-in-out infinite; }
// .animate-gradient-x { background-size: 200% 100%; animation: gradientMoveX 6s ease-in-out infinite; }
// .animate-shimmer { animation: shimmer 2s infinite linear; }
// .animate-glow { filter: drop-shadow(0 0 8px #fff8); }
// @keyframes gradientMove { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
// @keyframes gradientMoveX { 0%,100%{background-position:0% 50%}50%{background-position:100% 50%} }
// @keyframes shimmer { 0%{opacity:1}50%{opacity:0.7}100%{opacity:1} }
