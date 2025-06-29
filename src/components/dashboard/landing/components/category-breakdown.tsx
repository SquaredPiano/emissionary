'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { useTheme } from 'next-themes';
import React from 'react';

// Fallback data when no real data is available
const getFallbackData = () => [
  { name: 'Meat & Dairy', value: 45, color: '#ef4444' }, // red-500
  { name: 'Produce', value: 20, color: '#22c55e' }, // green-500
  { name: 'Grains', value: 15, color: '#f59e0b' }, // yellow-500
  { name: 'Packaged Foods', value: 12, color: '#8b5cf6' }, // purple-500
  { name: 'Beverages', value: 8, color: '#0ea5e9' }, // sky-500
];

interface CategoryBreakdownProps {
  emissions?: any;
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

export function CategoryBreakdown({ emissions }: CategoryBreakdownProps) {
  // Use real data if available, otherwise fallback to mock data
  const data = emissions?.categoryBreakdown ? 
    Object.entries(emissions.categoryBreakdown).map(([category, data]: [string, any]) => {
      const canonical = category.toLowerCase();
      return {
        name: canonical.charAt(0).toUpperCase() + canonical.slice(1),
        value: Math.round((data.totalEmissions / emissions.totalEmissions) * 100),
        color: getCategoryColor(canonical)
      }
    }).filter(item => item.value > 0) : 
    getFallbackData();

  // Ensure 'Unknown' category is included if present in the breakdown
  let hasUnknown = false;
  if (emissions?.categoryBreakdown && emissions.categoryBreakdown.unknown) {
    const unknownData = emissions.categoryBreakdown.unknown;
    const unknownValue = Math.round((unknownData.totalEmissions / emissions.totalEmissions) * 100);
    if (unknownValue > 0 && !data.some(item => item.name === 'Unknown')) {
      data.push({ name: 'Unknown', value: unknownValue, color: '#6b7280' });
      hasUnknown = true;
    }
  }

  function getCategoryColor(category: string): string {
    const colors: Record<string, string> = {
      // Main food categories
      produce: '#22c55e', // green-500
      beverages: '#0ea5e9', // sky-500
      snack: '#f59e0b', // yellow-500
      meat: '#ef4444', // red-500
      dairy: '#f97316', // orange-500
      prepared_food: '#8b5cf6', // purple-500
      bakery: '#84cc16', // lime-500
      other: '#6b7280', // gray-500
      
      // Legacy categories for backward compatibility
      vegetables: '#22c55e', // green-500
      fruits: '#16a34a', // green-600
      grains: '#f59e0b', // yellow-500
      processed: '#8b5cf6', // purple-500
      seafood: '#06b6d4', // cyan-500
      nuts: '#84cc16', // lime-500
      unknown: '#6b7280', // gray-500
    };
    return colors[category.toLowerCase()] || '#6b7280'; // gray-500 as default
  }

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
        {hasUnknown && (
          <div className="mb-2 p-2 rounded bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm font-medium">
            Some items could not be mapped to a known category. Help us improve by reporting unknowns!
          </div>
        )}
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