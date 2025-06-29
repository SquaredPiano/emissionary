'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

// Fallback data when no real data is available
const getFallbackData = () => [
  { date: 'Mon', emissions: 2.1 },
  { date: 'Tue', emissions: 1.8 },
  { date: 'Wed', emissions: 3.2 },
  { date: 'Thu', emissions: 2.5 },
  { date: 'Fri', emissions: 1.9 },
  { date: 'Sat', emissions: 4.1 },
  { date: 'Sun', emissions: 2.8 },
];

interface EmissionsChartProps {
  emissions?: any;
  lineType?: 'monotone' | 'linear';
}

export function EmissionsChart({ emissions }: EmissionsChartProps) {
  const { theme } = useTheme ? useTheme() : { theme: 'light' };
  const lineColor = theme === 'dark' ? '#10b981' : '#222';
  const dotColor = theme === 'dark' ? '#fff' : '#222';

  // Use real data if available, otherwise fallback to mock data
  const data = emissions?.data?.monthlyData ? 
    emissions.data.monthlyData.slice(-7).map((item: any) => ({
      date: new Date(item.month).toLocaleDateString('en-US', { weekday: 'short' }),
      emissions: item.emissions
    })) : 
    getFallbackData();

  if (data.length === 0) {
    return (
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Weekly Emissions Trend</CardTitle>
          <CardDescription>Your carbon footprint over the past week</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-black dark:text-muted-foreground mb-2">📊</div>
            <p className="text-black dark:text-muted-foreground">Upload a receipt to see your emissions trends</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Weekly Emissions Trend</CardTitle>
        <CardDescription>Your carbon footprint over the past week</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="date" 
              className="text-sm"
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              className="text-sm"
              tick={{ fontSize: 12 }}
              label={{ value: 'kg CO₂e', angle: -90, position: 'insideLeft', className: 'text-sm' }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${value} kg CO₂e`, 'Emissions']}
            />
            {/*
              Use 'monotone' for smooth (squiggly) lines, 'linear' for jagged. Default is 'monotone'.
              Dots and lines adapt to theme for visibility.
            */}
            <Line 
              type='monotone' 
              dataKey="emissions" 
              stroke={lineColor}
              strokeWidth={3}
              dot={{ fill: dotColor, stroke: lineColor, strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: lineColor, strokeWidth: 2, fill: dotColor }}
              connectNulls={true}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 