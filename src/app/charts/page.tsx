"use client";
import dynamic from 'next/dynamic';
import { Suspense, useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBreakdown } from '@/components/dashboard/charts/category-breakdown';
import { EmissionsTimeline } from '@/components/dashboard/charts/emissions-timeline';
import { ComparisonChart } from '@/components/dashboard/charts/comparison-chart';
import { CategoryEmissions } from '@/lib/database.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, AlertTriangle, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';

// Mock data for in-depth charts
const mockCategoryBreakdown: CategoryEmissions[] = [
  { category: 'Meat', emissions: 32.5, percentage: 38.2, itemCount: 12 },
  { category: 'Dairy', emissions: 18.1, percentage: 21.3, itemCount: 8 },
  { category: 'Produce', emissions: 12.7, percentage: 14.9, itemCount: 15 },
  { category: 'Grains', emissions: 9.3, percentage: 10.9, itemCount: 7 },
  { category: 'Snacks', emissions: 7.2, percentage: 8.5, itemCount: 5 },
  { category: 'Other', emissions: 4.0, percentage: 4.7, itemCount: 3 },
];

const mockUserEmissions = 72.3;
const mockCanadianAverage = 65.0;
const mockTypicalUserEmissions = 80.0;
const mockYearlyTimeline = [
  { month: '2023-01', emissions: 5.2 },
  { month: '2023-02', emissions: 6.1 },
  { month: '2023-03', emissions: 7.0 },
  { month: '2023-04', emissions: 6.5 },
  { month: '2023-05', emissions: 7.2 },
  { month: '2023-06', emissions: 8.0 },
  { month: '2023-07', emissions: 7.8 },
  { month: '2023-08', emissions: 8.1 },
  { month: '2023-09', emissions: 7.5 },
  { month: '2023-10', emissions: 6.9 },
  { month: '2023-11', emissions: 6.2 },
  { month: '2023-12', emissions: 5.8 },
];

const merchants = ['All', 'Walmart', 'Sobeys', 'Loblaws', 'No Frills', 'Metro'];
const allCategories = mockCategoryBreakdown.map(c => c.category);
const mockItemsByCategory: Record<string, { name: string; emissions: number }[]> = {
  Meat: [
    { name: 'Beef', emissions: 18.2 },
    { name: 'Chicken', emissions: 7.1 },
    { name: 'Pork', emissions: 7.2 },
  ],
  Dairy: [
    { name: 'Milk', emissions: 4.2 },
    { name: 'Cheese', emissions: 8.1 },
    { name: 'Yogurt', emissions: 2.1 },
  ],
  Produce: [
    { name: 'Apples', emissions: 2.2 },
    { name: 'Bananas', emissions: 1.1 },
    { name: 'Carrots', emissions: 0.7 },
  ],
  Grains: [
    { name: 'Bread', emissions: 3.1 },
    { name: 'Rice', emissions: 2.8 },
    { name: 'Oats', emissions: 1.2 },
  ],
  Snacks: [
    { name: 'Chips', emissions: 2.2 },
    { name: 'Cookies', emissions: 1.8 },
  ],
  Other: [
    { name: 'Coffee', emissions: 2.0 },
    { name: 'Tea', emissions: 1.0 },
  ],
};

const MultiSelect = ({ options, selected, onChange }: { options: string[]; selected: string[]; onChange: (v: string[]) => void }) => (
  <div className="flex flex-wrap gap-2">
    {options.map(opt => (
      <button
        key={opt}
        className={`px-2 py-1 rounded border text-xs ${selected.includes(opt) ? 'bg-green-500 text-white' : 'bg-muted'}`}
        onClick={() => onChange(selected.includes(opt) ? selected.filter(c => c !== opt) : [...selected, opt])}
        type="button"
      >
        {opt}
      </button>
    ))}
  </div>
);

// Mock data for stacked bar chart (monthly emissions by category)
const stackedBarData = [
  { month: 'Jan', Meat: 5, Dairy: 2, Produce: 1, Grains: 1, Snacks: 0.5 },
  { month: 'Feb', Meat: 4, Dairy: 2.5, Produce: 1.2, Grains: 1.1, Snacks: 0.7 },
  { month: 'Mar', Meat: 6, Dairy: 2.2, Produce: 1.5, Grains: 1.3, Snacks: 0.6 },
  { month: 'Apr', Meat: 5.5, Dairy: 2.1, Produce: 1.3, Grains: 1.2, Snacks: 0.8 },
  { month: 'May', Meat: 5.2, Dairy: 2.3, Produce: 1.4, Grains: 1.1, Snacks: 0.9 },
  { month: 'Jun', Meat: 4.8, Dairy: 2.4, Produce: 1.6, Grains: 1.0, Snacks: 0.7 },
];

// Mock data for heatmap calendar (daily emissions)
const heatmapData = Array.from({ length: 35 }, (_, i) => ({
  day: i + 1,
  emissions: Math.random() * 3,
}));

// Mock insight data
const mockBestMonth = { month: 'May', emissions: 10.2 };
const mockWorstMonth = { month: 'March', emissions: 15.8 };
const mockPercentChange = -12.5; // negative = improvement
const mockInsightMsg = mockPercentChange < 0
  ? 'Great job! Your emissions dropped 12.5% compared to last month.'
  : 'Heads up! Your emissions increased this month.';
const mockInsightIcon = mockPercentChange < 0 ? <TrendingDown className="h-6 w-6 text-green-600" /> : <TrendingUp className="h-6 w-6 text-red-600" />;
const mockInsightBg = mockPercentChange < 0 ? 'bg-green-50' : 'bg-red-50';

// Fun/Engagement mock data
const ecoEquivalency = (emissions: number) => ({
  trees: Math.round(emissions / 21), // 21kg CO2/year per tree
  km: Math.round(emissions / 0.192), // 0.192kg CO2/km (car)
});

// Fun Fact for engagement section
const funFact = "Did you know? Eating more lentils instead of beef can reduce your meal's carbon footprint by over 90%!";

// Eco Quiz for engagement section
const quiz = {
  question: "Which food has the highest carbon footprint per kg?",
  options: ["Beef", "Chicken", "Rice", "Potatoes"],
  answer: "Beef"
};

export default function ChartsPage() {
  // Example: add state for filters, date range, etc.
  // In a real app, these would control the data shown in the charts
  const [showCategory, setShowCategory] = useState(true);
  const [showTimeline, setShowTimeline] = useState(true);
  const [showComparison, setShowComparison] = useState(true);
  const [startDate, setStartDate] = useState<string>('2024-01-01');
  const [endDate, setEndDate] = useState<string>('2024-12-31');
  const [selectedMerchant, setSelectedMerchant] = useState('All');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(allCategories);
  const [drilldownCategory, setDrilldownCategory] = useState<string | null>(null);
  const [showTypicalUser, setShowTypicalUser] = useState(false);
  const [showYearOverYear, setShowYearOverYear] = useState(false);

  // Filtered data for charts (mock logic)
  const filteredCategoryBreakdown = mockCategoryBreakdown.filter(c => selectedCategories.includes(c.category));

  // Confetti animation (simple demo)
  const confettiRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (mockUserEmissions < 60 && confettiRef.current) {
      confettiRef.current.classList.add('animate-confetti');
      setTimeout(() => confettiRef.current?.classList.remove('animate-confetti'), 2000);
    }
  }, [mockUserEmissions]);

  const stickyRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [isStuck, setIsStuck] = useState(false);
  useEffect(() => {
    const observer = new window.IntersectionObserver(
      ([entry]) => setIsStuck(!entry.isIntersecting),
      { root: null, threshold: 0, rootMargin: '0px' }
    );
    if (sentinelRef.current) observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {/* Sentinel for sticky bar detection */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {/* Animated Gradient Background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-green-200 via-lime-200 to-blue-100 animate-gradient-x" style={{ backgroundSize: '200% 200%' }} />
      <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded z-50">Skip to main content</a>
      <main className="w-full min-h-screen flex flex-col items-center justify-start px-0 md:px-8 lg:px-16 pt-8" id="main-content">
        {/* Sticky Filter Bar */}
        <div ref={stickyRef} className="sticky top-4 z-20 w-full max-w-6xl mx-auto mb-8 rounded-2xl shadow-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg px-6 py-4 border border-muted">
          <div className="flex flex-col md:flex-row items-center gap-4 w-full">
            <div className="flex flex-col md:flex-row items-center gap-4 w-full flex-1">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-black dark:text-zinc-200">Date Range</span>
                <div className="flex gap-2 items-center">
                  <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg text-black dark:text-zinc-200" max={endDate} />
                  <span className="text-black dark:text-zinc-200">to</span>
                  <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg text-black dark:text-zinc-200" min={startDate} />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-black dark:text-zinc-200">Merchant</span>
                <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                  <SelectTrigger className="w-[140px] rounded-lg text-black dark:text-zinc-200">
                    <SelectValue placeholder="Merchant" />
                  </SelectTrigger>
                  <SelectContent>
                    {merchants.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-black dark:text-zinc-200">Categories</span>
                <div className="flex flex-wrap gap-2">
                  {allCategories.map(opt => (
                    <Button
                      key={opt}
                      size="sm"
                      variant={selectedCategories.includes(opt) ? 'default' : 'outline'}
                      className="rounded-full px-3 py-1 text-xs"
                      onClick={() => setSelectedCategories(selectedCategories.includes(opt) ? selectedCategories.filter(c => c !== opt) : [...selectedCategories, opt])}
                      type="button"
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            {/* Fade-in icons when sticky, at end of row */}
            <AnimatePresence>
              {isStuck && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center gap-3"
                >
                  <ThemeToggle />
                  <UserButton afterSignOutUrl="/" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        {/* Customizable Grid Layout */}
        <div className="w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 shadow border border-muted flex flex-col justify-center items-center">
            <Card className="col-span-1 md:col-span-2 shadow-xl rounded-2xl p-0">
              <CardContent className="flex items-center gap-4 p-6">
                <div>{mockInsightIcon}</div>
                <div>
                  <div className="text-lg font-bold text-black dark:text-white mb-1">{mockInsightMsg}</div>
                  <div className="text-sm text-muted-foreground">
                    Best month: <span className="font-semibold text-green-700">{mockBestMonth.month}</span> ({mockBestMonth.emissions} kg CO₂e),
                    Worst month: <span className="font-semibold text-red-700">{mockWorstMonth.month}</span> ({mockWorstMonth.emissions} kg CO₂e)
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 shadow border border-muted">
            <CategoryBreakdown data={filteredCategoryBreakdown} onDrilldown={setDrilldownCategory} />
          </div>
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 shadow border border-muted">
            <EmissionsTimeline data={mockYearlyTimeline} />
          </div>
          <div className="p-4 rounded-2xl bg-white/90 dark:bg-zinc-900/90 shadow border border-muted">
            <ComparisonChart userEmissions={mockUserEmissions} canadianAverage={mockCanadianAverage} />
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-8">
          <label className="text-sm font-medium text-black dark:text-zinc-200">Date Range:</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border rounded px-2 py-1 text-black dark:text-white bg-white dark:bg-zinc-900"
            max={endDate}
          />
          <span className="mx-2 text-muted-foreground">to</span>
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
            className="border rounded px-2 py-1 text-black dark:text-white bg-white dark:bg-zinc-900"
            min={startDate}
          />
          <span className="text-xs text-muted-foreground ml-4">(Demo: charts not filtered yet)</span>
        </div>
        <div className="flex flex-wrap gap-6 mb-8">
          <button
            className={`px-4 py-2 rounded border ${showCategory ? 'bg-green-500 text-white' : 'bg-muted'}`}
            onClick={() => setShowCategory((v) => !v)}
          >
            Category Breakdown
          </button>
          <button
            className={`px-4 py-2 rounded border ${showTimeline ? 'bg-green-500 text-white' : 'bg-muted'}`}
            onClick={() => setShowTimeline((v) => !v)}
          >
            Emissions Timeline
          </button>
          <button
            className={`px-4 py-2 rounded border ${showComparison ? 'bg-green-500 text-white' : 'bg-muted'}`}
            onClick={() => setShowComparison((v) => !v)}
          >
            Comparison Chart
          </button>
        </div>
        <div className="space-y-8">
          {/* Merchant and Category Filters */}
          <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
            <label className="text-sm font-medium text-black dark:text-zinc-200">Merchant:</label>
            <select
              value={selectedMerchant}
              onChange={e => setSelectedMerchant(e.target.value)}
              className="border rounded px-2 py-1 text-black dark:text-white bg-white dark:bg-zinc-900"
            >
              {merchants.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
            <label className="text-sm font-medium text-black dark:text-zinc-200 ml-4">Categories:</label>
            <MultiSelect options={allCategories} selected={selectedCategories} onChange={setSelectedCategories} />
          </div>
          {/* Comparative & Overlay Features */}
          <div className="flex flex-wrap gap-4 mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showTypicalUser} onChange={e => setShowTypicalUser(e.target.checked)} />
              <span className="text-sm text-black dark:text-zinc-200">Overlay Typical User</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showYearOverYear} onChange={e => setShowYearOverYear(e.target.checked)} />
              <span className="text-sm text-black dark:text-zinc-200">Year-over-Year Comparison</span>
            </label>
          </div>
          {/* Advanced Visualizations */}
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">Advanced Visualizations</h2>
            {/* Stacked Bar Chart */}
            <Card className="mb-8 animate-fadein" tabIndex={0} aria-label="Stacked Bar Chart: Monthly Emissions by Category" role="region">
              <CardHeader>
                <CardTitle>Monthly Emissions by Category (Stacked Bar)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stackedBarData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="month" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Meat" stackId="a" fill="#10b981" />
                      <Bar dataKey="Dairy" stackId="a" fill="#3b82f6" />
                      <Bar dataKey="Produce" stackId="a" fill="#f59e0b" />
                      <Bar dataKey="Grains" stackId="a" fill="#8b5cf6" />
                      <Bar dataKey="Snacks" stackId="a" fill="#ef4444" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            {/* Heatmap Calendar */}
            <Card className="animate-fadein" tabIndex={0} aria-label="Emissions Heatmap Calendar" role="region">
              <CardHeader>
                <CardTitle>Emissions Heatmap Calendar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-1 w-fit mx-auto">
                  {heatmapData.map((d, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded text-xs flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
                      style={{
                        background: `rgba(34,197,94,${0.15 + 0.25 * (d.emissions / 3)})`,
                        color: d.emissions > 2.5 ? 'white' : 'black',
                        fontWeight: d.emissions > 2.5 ? 'bold' : 'normal',
                      }}
                      tabIndex={0}
                      aria-label={`Day ${d.day}: ${d.emissions.toFixed(2)} kg CO₂e`}
                      title={`Day ${d.day}: ${d.emissions.toFixed(2)} kg CO₂e${d.emissions > 2.5 ? ' (High day: likely due to a large meat purchase)' : ''}`}
                    >
                      {d.day}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground mt-2 text-center">Darker = higher emissions</div>
              </CardContent>
            </Card>
          </div>
          {/* Fun & Engagement Section */}
          <div className="mt-12 space-y-8">
            {/* Eco-Equivalency Card */}
            <Card className="bg-lime-50 border-lime-200 border-2 relative overflow-hidden" tabIndex={0} aria-label="Eco Equivalency" role="region">
              <CardHeader>
                <CardTitle className="text-black">Eco-Equivalency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-lg font-semibold text-green-700">
                  You've saved <span className="font-bold">{mockUserEmissions} kg CO₂e</span>
                </div>
                <div className="mt-2 text-sm text-black">
                  That's like planting <span className="font-bold">{ecoEquivalency(mockUserEmissions).trees} trees</span> or not driving <span className="font-bold">{ecoEquivalency(mockUserEmissions).km} km</span>!
                </div>
                <div ref={confettiRef} className="absolute inset-0 pointer-events-none" aria-hidden="true"></div>
              </CardContent>
            </Card>
            {/* Fun Fact Card */}
            <Card className="bg-yellow-50 border-yellow-200 border-2" tabIndex={0} aria-label="Fun Fact" role="region">
              <CardHeader>
                <CardTitle className="text-black">Fun Fact</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-md text-yellow-800 font-medium">{funFact}</div>
              </CardContent>
            </Card>
            {/* Eco Quiz Card */}
            <Card className="bg-blue-50 border-blue-200 border-2" tabIndex={0} aria-label="Eco Quiz" role="region">
              <CardHeader>
                <CardTitle className="text-black">Eco Quiz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-md font-medium mb-2 text-black">{quiz.question}</div>
                <ul className="space-y-1">
                  {quiz.options.map(opt => (
                    <li key={opt} className="flex items-center gap-2">
                      <input type="radio" name="eco-quiz" id={opt} disabled />
                      <label htmlFor={opt} className="text-black">{opt}</label>
                      {opt === quiz.answer && <span className="ml-2 text-green-600 font-bold">✔</span>}
                    </li>
                  ))}
                </ul>
                <div className="mt-2 text-xs text-muted-foreground">(Correct answer: {quiz.answer})</div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </>
  );
} 