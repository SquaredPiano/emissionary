'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

// TODO: Replace with actual data from backend API calls
const mockCategoryData = [
  { name: 'Meat & Dairy', value: 45, color: '#ef4444' },
  { name: 'Produce', value: 20, color: '#22c55e' },
  { name: 'Grains', value: 15, color: '#f59e0b' },
  { name: 'Packaged Foods', value: 12, color: '#8b5cf6' },
  { name: 'Beverages', value: 8, color: '#06b6d4' },
];

interface CategoryBreakdownProps {
  data?: typeof mockCategoryData;
}

export function CategoryBreakdown({ data = mockCategoryData }: CategoryBreakdownProps) {
  if (data.length === 0) {
    return (
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Emissions by Category</CardTitle>
          <CardDescription>Breakdown of your carbon footprint by food type</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground mb-2">🥩</div>
            <p className="text-muted-foreground">Upload receipts to see category breakdown</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Emissions by Category</CardTitle>
        <CardDescription>Breakdown of your carbon footprint by food type</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px'
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
              formatter={(value: number) => [`${value}%`, 'Emissions']}
            />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{
                fontSize: '12px',
                color: 'hsl(var(--foreground))'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 