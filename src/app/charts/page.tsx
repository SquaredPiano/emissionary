"use client";
import dynamic from 'next/dynamic';
import { Suspense, useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryBreakdown } from '@/components/dashboard/charts/category-breakdown';
import { EmissionsTimeline } from '@/components/dashboard/charts/emissions-timeline';
import { ComparisonChart } from '@/components/dashboard/charts/comparison-chart';
import { CategoryEmissions } from '@/lib/database.types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { CheckCircle, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, TreePine, Car, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { motion, AnimatePresence } from 'framer-motion';
import { DashboardLayout } from '@/components/dashboard/layout/dashboard-layout';

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

// 1. Helper functions for insights
function getBiggestMonthChange(data) {
  let maxChange = 0, maxMonth = null, direction = null, reason = '';
  for (let i = 1; i < data.length; i++) {
    const change = data[i].emissions - data[i-1].emissions;
    if (Math.abs(change) > Math.abs(maxChange)) {
      maxChange = change;
      maxMonth = data[i].month;
      direction = change > 0 ? 'increase' : 'decrease';
      reason = change > 0 ? 'Higher meat purchases' : 'More plant-based meals'; // mock reason
    }
  }
  return { maxChange, maxMonth, direction, reason };
}
function getAnomalies(data) {
  // Simple: flag months with >30% change
  let anomalies = [];
  for (let i = 1; i < data.length; i++) {
    const pct = (data[i].emissions - data[i-1].emissions) / data[i-1].emissions;
    if (Math.abs(pct) > 0.3) {
      anomalies.push({ month: data[i].month, change: pct, reason: pct > 0 ? 'Unusually high meat purchase' : 'Unusually low emissions' });
    }
  }
  return anomalies;
}
function getTopCategoriesOverTime(categoryData) {
  // For each month, get top 3 categories
  // Here, just return mock
  return [
    { month: 'Jan', top: ['Meat', 'Dairy', 'Produce'] },
    { month: 'Feb', top: ['Meat', 'Dairy', 'Produce'] },
    { month: 'Mar', top: ['Meat', 'Dairy', 'Grains'] },
    { month: 'Apr', top: ['Meat', 'Dairy', 'Produce'] },
    { month: 'May', top: ['Meat', 'Dairy', 'Produce'] },
    { month: 'Jun', top: ['Meat', 'Dairy', 'Produce'] },
  ];
}
function getCategorySwitching() {
  // Mock: "You bought less meat and more produce in Q2"
  return 'You bought less meat and more produce in Q2.';
}
function getEcoFriendlyMerchant() {
  // Mock: "Sobeys is your greenest merchant (avg 5.2 kg CO₂e/receipt)"
  return { merchant: 'Sobeys', avg: 5.2 };
}
function getMerchantTrends() {
  // Mock: "You are shopping more at lower-emission merchants over time."
  return 'You are shopping more at lower-emission merchants over time.';
}
function getBestStreak(data) {
  // Longest streak of decreasing emissions
  let streak = 0, maxStreak = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i].emissions < data[i-1].emissions) streak++;
    else streak = 0;
    if (streak > maxStreak) maxStreak = streak;
  }
  return maxStreak;
}
function getLowestMonth(data) {
  let min = data[0].emissions, month = data[0].month;
  for (let d of data) if (d.emissions < min) { min = d.emissions; month = d.month; }
  return { month, min };
}
function getPersonalizedTip() {
  // Mock: "Swap 2 meat meals for plant-based to save 8kg CO₂e"
  return 'Swap 2 meat meals for plant-based next month to save 8 kg CO₂e.';
}
function getGoalProgress() {
  // Mock: "You are 60% toward your 10% reduction goal."
  return 'You are 60% toward your 10% reduction goal.';
}
function getCompareLastYear() {
  // Mock: "You've reduced your emissions by 15% compared to last year."
  return 'You\'ve reduced your emissions by 15% compared to last year.';
}
function getPeerComparison() {
  // Mock: "You're in the top 20% of eco-friendly shoppers in your area."
  return 'You\'re in the top 20% of eco-friendly shoppers in your area.';
}

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
    <DashboardLayout>
      {/* Sentinel for sticky bar detection */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      <a href="#main-content" className="sr-only focus:not-sr-only absolute top-2 left-2 bg-green-600 text-white px-3 py-1 rounded z-50">Skip to main content</a>
      <main className="flex flex-col min-h-screen w-full items-center justify-start px-0 md:px-8 lg:px-16 pt-8" id="main-content">
        {/* Sentinel for sticky mini-bar detection */}
        <div ref={sentinelRef} style={{ height: 1 }} />
        {/* Tiny sticky bar at top right, matching other pages, with fade in/out */}
        <AnimatePresence>
          {isStuck && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.3 }}
              className="fixed top-4 right-4 z-[100] bg-white/90 dark:bg-zinc-900/90 border border-muted shadow-lg rounded-2xl px-4 py-2 flex items-center gap-3 backdrop-blur-lg"
            >
              <ThemeToggle />
              <UserButton afterSignOutUrl="/" />
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }} className="w-full max-w-6xl mx-auto space-y-8">
          {/* Sticky Filter Bar */}
          <form aria-label="Filter controls" className="sticky top-4 z-20 w-full max-w-6xl mx-auto mb-8 rounded-2xl shadow-lg bg-white/80 dark:bg-zinc-900/80 backdrop-blur-lg px-6 py-4 border border-muted">
            <div className="flex flex-row items-center justify-between w-full gap-4">
              <fieldset className="flex flex-col md:flex-row items-center gap-4 w-full flex-1" aria-label="Filters">
                <legend className="sr-only">Filters</legend>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-black dark:text-zinc-200">Date Range</span>
                  <div className="flex gap-2 items-center">
                    <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="rounded-lg text-black dark:text-zinc-200 focus-visible:ring-2 focus-visible:ring-green-500 transition duration-200" max={endDate} aria-label="Start date" />
                    <span className="text-black dark:text-zinc-200">to</span>
                    <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="rounded-lg text-black dark:text-zinc-200 focus-visible:ring-2 focus-visible:ring-green-500 transition duration-200" min={startDate} aria-label="End date" />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-black dark:text-zinc-200">Merchant</span>
                  <Select value={selectedMerchant} onValueChange={setSelectedMerchant} aria-label="Merchant select">
                    <SelectTrigger className="w-[140px] rounded-lg text-black dark:text-zinc-200 focus-visible:ring-2 focus-visible:ring-green-500 transition duration-200">
                      <SelectValue placeholder="Merchant" />
                    </SelectTrigger>
                    <SelectContent>
                      {merchants.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-black dark:text-zinc-200">Categories</span>
                  <div className="flex flex-wrap gap-2" role="group" aria-label="Category filter">
                    {allCategories.map(opt => (
                      <button
                        key={opt}
                        type="button"
                        tabIndex={0}
                        aria-pressed={selectedCategories.includes(opt)}
                        aria-label={opt}
                        className={`rounded-full px-3 py-1 text-xs font-medium border transition duration-200 ease-in-out focus-visible:ring-2 focus-visible:ring-green-500 focus:outline-none ${selectedCategories.includes(opt) ? 'bg-green-500 text-white border-green-600' : 'bg-muted text-black dark:text-zinc-200 border-muted-foreground hover:bg-green-100 dark:hover:bg-green-900'}`}
                        onClick={() => setSelectedCategories(selectedCategories.includes(opt) ? selectedCategories.filter(c => c !== opt) : [...selectedCategories, opt])}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </fieldset>
            </div>
          </form>
          {/* Insights Card */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-0 w-full">
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
            </motion.div>
          </motion.div>
          {/* Charts Section */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="shadow-lg rounded-2xl p-0 bg-white/90 dark:bg-zinc-900/80 border border-muted flex flex-col justify-center items-center h-auto min-h-[400px]">
                <CardHeader className="w-full"><CardTitle>Monthly Emissions by Category (Stacked Bar)</CardTitle></CardHeader>
                <CardContent className="w-full h-[340px] flex items-center justify-center p-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={stackedBarData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 24 }}
                      barCategoryGap={16}
                      barGap={4}
                    >
                      <CartesianGrid strokeDasharray="4 4" stroke="#2e3742" />
                      <XAxis
                        dataKey="month"
                        stroke="#b3b9c9"
                        fontSize={14}
                        tickLine={false}
                        axisLine={false}
                        tick={{ dy: 8 }}
                      />
                      <YAxis
                        stroke="#b3b9c9"
                        fontSize={14}
                        tickLine={false}
                        axisLine={false}
                        tick={{ dx: -4 }}
                      />
                      <Tooltip
                        contentStyle={{ background: 'rgba(24, 28, 38, 0.95)', borderRadius: 12, border: 'none', color: '#fff', boxShadow: '0 4px 16px 0 rgba(0,0,0,0.12)' }}
                        itemStyle={{ fontWeight: 600, fontSize: 14 }}
                        labelStyle={{ color: '#a3a9b8', fontWeight: 500, fontSize: 13 }}
                        cursor={{ fill: 'rgba(16,185,129,0.08)' }}
                      />
                      <Legend
                        iconType="circle"
                        wrapperStyle={{ paddingTop: 12 }}
                        align="center"
                        verticalAlign="bottom"
                        formatter={(value) => <span style={{ color: '#fff', fontWeight: 500, fontSize: 15 }}>{value}</span>}
                      />
                      <Bar dataKey="Meat" stackId="a" fill="#10b981" radius={[8, 8, 0, 0]} isAnimationActive />
                      <Bar dataKey="Dairy" stackId="a" fill="#3b82f6" radius={[8, 8, 0, 0]} isAnimationActive />
                      <Bar dataKey="Produce" stackId="a" fill="#f59e0b" radius={[8, 8, 0, 0]} isAnimationActive />
                      <Bar dataKey="Grains" stackId="a" fill="#a78bfa" radius={[8, 8, 0, 0]} isAnimationActive />
                      <Bar dataKey="Snacks" stackId="a" fill="#ef4444" radius={[8, 8, 0, 0]} isAnimationActive />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
            <EmissionsTimeline data={mockYearlyTimeline} />
          </motion.div>
          {/* Fun & Engagement Section */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
            {/* Eco-Equivalency Card */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-lime-50 dark:bg-emerald-900/70 border-lime-200 dark:border-emerald-800 border-2 relative overflow-hidden flex flex-col items-center gap-4 p-6 shadow-lg rounded-2xl h-auto min-h-[220px]">
                <div className="flex flex-col items-center justify-center">
                  <TreePine className="h-8 w-8 text-green-400 mb-2" />
                  <Car className="h-8 w-8 text-blue-400" />
                </div>
                <div className="text-center">
                  <CardTitle className="text-black dark:text-emerald-100 mb-2">Eco-Equivalency</CardTitle>
                  <div className="text-lg font-semibold text-green-700 dark:text-emerald-200">
                    You've saved <span className="font-bold">{mockUserEmissions} kg CO₂e</span>
                  </div>
                  <div className="mt-2 text-sm text-black dark:text-emerald-100">
                    That's like planting <span className="font-bold">{ecoEquivalency(mockUserEmissions).trees} trees</span> or not driving <span className="font-bold">{ecoEquivalency(mockUserEmissions).km} km</span>!
                  </div>
                </div>
              </Card>
            </motion.div>
            {/* Fun Fact Card */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-yellow-50 dark:bg-amber-900/70 border-yellow-200 dark:border-amber-800 border-2 flex flex-col items-center gap-4 p-6 shadow-lg rounded-2xl h-auto min-h-[220px]">
                <Lightbulb className="h-8 w-8 text-yellow-400" />
                <div className="text-center">
                  <CardTitle className="text-black dark:text-amber-100 mb-2">Fun Fact</CardTitle>
                  <div className="text-md text-yellow-800 dark:text-amber-100 font-medium">{funFact}</div>
                </div>
              </Card>
            </motion.div>
            {/* Eco Quiz Card */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-blue-50 dark:bg-blue-900/60 border-blue-200 dark:border-blue-800 border-2 shadow-lg rounded-2xl h-auto min-h-[220px] flex flex-col items-center p-6">
                <CardHeader className="w-full text-center">
                  <CardTitle className="text-black dark:text-blue-100">Eco Quiz</CardTitle>
                </CardHeader>
                <CardContent className="w-full flex flex-col items-center">
                  {(() => {
                    const [selected, setSelected] = useState<string | null>(null);
                    const [submitted, setSubmitted] = useState(false);
                    const [isCorrect, setIsCorrect] = useState(false);
                    const [animate, setAnimate] = useState<string | null>(null);
                    const handleSubmit = (e: React.FormEvent) => {
                      e.preventDefault();
                      setSubmitted(true);
                      setIsCorrect(selected === quiz.answer);
                      setAnimate(selected === quiz.answer ? 'correct' : 'incorrect');
                      setTimeout(() => setAnimate(null), 800);
                    };
                    const handleReplay = () => {
                      setSelected(null);
                      setSubmitted(false);
                      setIsCorrect(false);
                      setAnimate(null);
                    };
                    return (
                      <form onSubmit={handleSubmit}>
                        <div className="text-md font-medium mb-2 text-black dark:text-blue-100 flex items-center gap-2">
                          {quiz.question}
                          {submitted && (
                            isCorrect ? (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                className="inline-flex"
                              >
                                <CheckCircle className="h-6 w-6 text-green-600" />
                              </motion.span>
                            ) : (
                              <motion.span
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                className="inline-flex"
                              >
                                <AlertTriangle className="h-6 w-6 text-red-600" />
                              </motion.span>
                            )
                          )}
                        </div>
                        <ul className="space-y-1 mb-4">
                          {quiz.options.map(opt => (
                            <motion.li
                              key={opt}
                              className="flex items-center gap-2"
                              animate={submitted && opt === quiz.answer ? { scale: [1, 1.1, 1] } : {}}
                              transition={{ duration: 0.4 }}
                            >
                              <input
                                type="radio"
                                name="eco-quiz"
                                id={opt}
                                value={opt}
                                checked={selected === opt}
                                onChange={() => setSelected(opt)}
                                disabled={submitted}
                                className="accent-blue-600"
                              />
                              <label htmlFor={opt} className={`text-black dark:text-blue-100 cursor-pointer select-none ${submitted && opt === quiz.answer ? 'font-bold text-green-700 dark:text-green-300' : ''}`}>{opt}</label>
                              {submitted && opt === quiz.answer && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1.2 }}
                                  transition={{ type: 'spring', stiffness: 400, damping: 10 }}
                                  className="ml-2 text-green-600 font-bold"
                                >✔</motion.span>
                              )}
                            </motion.li>
                          ))}
                        </ul>
                        <motion.div
                          animate={animate === 'correct' ? { scale: [1, 1.1, 1] } : animate === 'incorrect' ? { x: [0, -10, 10, -10, 10, 0] } : {}}
                          transition={{ duration: 0.6 }}
                        >
                          {!submitted ? (
                            <button
                              type="submit"
                              disabled={!selected}
                              className="mt-2 px-6 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed"
                            >
                              Submit
                            </button>
                          ) : (
                            <div className="flex flex-col gap-2">
                              <div className={`font-semibold ${isCorrect ? 'text-green-700 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>{isCorrect ? 'Correct!' : 'Incorrect.'}</div>
                              <div className="text-xs text-muted-foreground dark:text-blue-100">Correct answer: {quiz.answer}</div>
                              <button
                                type="button"
                                onClick={handleReplay}
                                className="mt-2 px-6 py-2 rounded-lg bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-100 font-semibold border border-blue-200 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                              >
                                Replay
                              </button>
                            </div>
                          )}
                        </motion.div>
                      </form>
                    );
                  })()}
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
          {/* Advanced Analytics Section */}
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5, ease: 'easeOut' }} className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full mt-8">
            {/* 1. Personalized Trends & Anomalies */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Biggest Month-to-Month Change</CardTitle>
                <div className="text-muted-foreground text-sm">{getBiggestMonthChange(mockYearlyTimeline).reason}</div>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Anomaly Detection</CardTitle>
                <div className="text-muted-foreground text-sm">{getAnomalies(mockYearlyTimeline).map(a => <div key={a.month}>{a.month}: {a.change > 0 ? '+' : ''}{(a.change*100).toFixed(1)}% — {a.reason}</div>)}</div>
              </Card>
            </motion.div>
            {/* 2. Category Deep Dives */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Top 3 Emission Categories Over Time</CardTitle>
                <div className="text-muted-foreground text-sm">{getTopCategoriesOverTime().map(c => <div key={c.month}>{c.month}: {c.top.join(', ')}</div>)}</div>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Category Switching</CardTitle>
                <div className="text-muted-foreground text-sm">{getCategorySwitching()}</div>
              </Card>
            </motion.div>
            {/* 3. Merchant Insights */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Most Eco-Friendly Merchant</CardTitle>
                <div className="text-muted-foreground text-sm">{getEcoFriendlyMerchant().merchant} is your greenest merchant (avg {getEcoFriendlyMerchant().avg} kg CO₂e/receipt)</div>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Merchant Trends</CardTitle>
                <div className="text-muted-foreground text-sm">{getMerchantTrends()}</div>
              </Card>
            </motion.div>
            {/* 4. Personal Bests & Streaks */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Best Streak</CardTitle>
                <div className="text-muted-foreground text-sm">You had a {getBestStreak(mockYearlyTimeline)}-month streak of lowering your emissions!</div>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Lowest Emission Month</CardTitle>
                <div className="text-muted-foreground text-sm">{getLowestMonth(mockYearlyTimeline).month} ({getLowestMonth(mockYearlyTimeline).min} kg CO₂e)</div>
              </Card>
            </motion.div>
            {/* 5. Eco-Action Suggestions */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Personalized Tip</CardTitle>
                <div className="text-muted-foreground text-sm">{getPersonalizedTip()}</div>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Goal Progress</CardTitle>
                <div className="text-muted-foreground text-sm">{getGoalProgress()}</div>
              </Card>
            </motion.div>
            {/* 6. Comparative & Contextual Insights */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Compare to Last Year</CardTitle>
                <div className="text-muted-foreground text-sm">{getCompareLastYear()}</div>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Peer Comparison</CardTitle>
                <div className="text-muted-foreground text-sm">{getPeerComparison()}</div>
              </Card>
            </motion.div>
            {/* 7. Visualizations */}
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-4 col-span-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Sankey Diagram: Spending Flow</CardTitle>
                <div className="w-full h-64 flex items-center justify-center">
                  <div className="grid grid-cols-3 gap-4 w-full max-w-2xl">
                    {/* Merchants */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-center">Merchants</div>
                      <div className="space-y-1">
                        <div className="bg-blue-100 dark:bg-blue-900/50 p-2 rounded text-xs text-center">Sobeys (40%)</div>
                        <div className="bg-green-100 dark:bg-green-900/50 p-2 rounded text-xs text-center">Walmart (35%)</div>
                        <div className="bg-purple-100 dark:bg-purple-900/50 p-2 rounded text-xs text-center">Loblaws (25%)</div>
                      </div>
                    </div>
                    {/* Categories */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-center">Categories</div>
                      <div className="space-y-1">
                        <div className="bg-red-100 dark:bg-red-900/50 p-2 rounded text-xs text-center">Meat (45%)</div>
                        <div className="bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded text-xs text-center">Dairy (30%)</div>
                        <div className="bg-emerald-100 dark:bg-emerald-900/50 p-2 rounded text-xs text-center">Produce (25%)</div>
                      </div>
                    </div>
                    {/* Emissions */}
                    <div className="space-y-2">
                      <div className="text-sm font-medium text-center">Emissions</div>
                      <div className="space-y-1">
                        <div className="bg-orange-100 dark:bg-orange-900/50 p-2 rounded text-xs text-center">High (8.2 kg)</div>
                        <div className="bg-amber-100 dark:bg-amber-900/50 p-2 rounded text-xs text-center">Medium (5.1 kg)</div>
                        <div className="bg-lime-100 dark:bg-lime-900/50 p-2 rounded text-xs text-center">Low (2.3 kg)</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-muted-foreground text-sm text-center">Flow visualization showing how your spending at different merchants flows through categories to emissions</div>
              </Card>
            </motion.div>
            <motion.div whileHover={{ scale: 1.025, boxShadow: '0 8px 32px 0 rgba(16,185,129,0.10)' }} transition={{ type: 'spring', stiffness: 300, damping: 20 }}>
              <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl p-6 flex flex-col gap-4 col-span-2">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold">Enhanced Heatmap Calendar</CardTitle>
                <div className="w-full">
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="text-xs font-medium text-center text-muted-foreground p-1">{day}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {/* Mock calendar data - 4 weeks */}
                    {Array.from({ length: 28 }, (_, i) => {
                      const day = i + 1;
                      const emissions = Math.random() * 10; // Mock emissions data
                      const intensity = Math.min(emissions / 10, 1);
                      const bgColor = intensity > 0.7 ? 'bg-red-500' : intensity > 0.4 ? 'bg-yellow-500' : 'bg-green-500';
                      const isStreak = day >= 15 && day <= 18; // Mock streak
                      return (
                        <div
                          key={day}
                          className={`${bgColor} ${isStreak ? 'ring-2 ring-blue-400' : ''} h-8 rounded text-xs flex items-center justify-center text-white cursor-pointer hover:opacity-80 transition-opacity`}
                          title={`Day ${day}: ${emissions.toFixed(1)} kg CO₂e${isStreak ? ' (Part of streak!)' : ''}`}
                        >
                          {day}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="text-muted-foreground text-sm text-center">Interactive calendar with emission intensity and streak highlights</div>
              </Card>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </DashboardLayout>
  );
} 