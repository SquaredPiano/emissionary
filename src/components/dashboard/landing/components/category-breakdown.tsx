'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTheme } from 'next-themes';
import React from 'react';

// TODO: Replace with actual data from backend API calls
const mockCategoryData = [
  { name: 'Meat & Dairy', value: 45, color: '#ef4444' }, // red-500
  { name: 'Produce', value: 20, color: '#22c55e' }, // green-500
  { name: 'Grains', value: 15, color: '#f59e0b' }, // yellow-500
  { name: 'Packaged Foods', value: 12, color: '#8b5cf6' }, // purple-500
  { name: 'Beverages', value: 8, color: '#0ea5e9' }, // sky-500
];

interface CategoryBreakdownProps {
  data?: typeof mockCategoryData;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const { name, value } = payload[0].payload;
    return (
      <div
        style={{
          background: 'rgba(24, 24, 24, 0.95)',
          color: '#fff',
          borderRadius: 8,
          padding: '10px 16px',
          fontSize: 16,
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        {name}: {value}%
      </div>
    );
  }
  return null;
};

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
              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              wrapperStyle={{
                fontSize: '14px',
                color: 'hsl(var(--foreground))',
                fontWeight: 500,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
} 