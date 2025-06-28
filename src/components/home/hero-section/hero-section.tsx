import { Button } from '@/components/ui/button';
import { Leaf, Camera, TrendingDown } from 'lucide-react';
import Link from 'next/link';

export function HeroSection() {
  return (
    <section className={'mx-auto max-w-7xl px-[32px] relative flex items-center justify-between mt-16 mb-12'}>
      <div className={'text-center w-full'}>
        <div className="flex items-center justify-center gap-2 mb-6">
          <Leaf className="h-8 w-8 text-green-600" />
          <span className="text-2xl font-bold text-green-600">Emissionary</span>
        </div>
        
        <h1 className={'text-[48px] leading-[48px] md:text-[80px] md:leading-[80px] tracking-[-1.6px] font-medium mb-6'}>
          Snap your receipt.
          <br />
          <span className="text-green-600">See your footprint.</span>
          <br />
          Cut your emissions.
        </h1>
        
        <p className={'mt-6 text-[18px] leading-[27px] md:text-[20px] md:leading-[30px] text-muted-foreground max-w-3xl mx-auto mb-8'}>
          Upload your grocery receipts and instantly see your carbon footprint. 
          Get personalized tips to reduce your environmental impact and track your progress over time.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
          <Link href="/sign-up">
            <Button size="lg" className="bg-green-600 hover:bg-green-700 text-white px-8 py-3 text-lg">
              <Camera className="h-5 w-5 mr-2" />
              Start Tracking
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button variant="outline" size="lg" className="px-8 py-3 text-lg">
              <TrendingDown className="h-5 w-5 mr-2" />
              View Demo
            </Button>
          </Link>
        </div>

        {/* Feature highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Camera className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="font-semibold mb-2">Snap & Upload</h3>
            <p className="text-sm text-muted-foreground">
              Take a photo of your receipt and upload it instantly
            </p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Leaf className="h-8 w-8 text-blue-600" />
            </div>
            <h3 className="font-semibold mb-2">AI Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Our AI extracts items and calculates carbon emissions
            </p>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingDown className="h-8 w-8 text-purple-600" />
            </div>
            <h3 className="font-semibold mb-2">Track Progress</h3>
            <p className="text-sm text-muted-foreground">
              Monitor your emissions and get personalized tips
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
