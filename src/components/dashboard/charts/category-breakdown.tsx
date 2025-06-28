'use client';

import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CategoryEmissions } from '@/lib/database.types';

interface CategoryBreakdownProps {
  data: CategoryEmissions[];
  title?: string;
  description?: string;
}

const COLORS = [
  '#10b981', // Green
  '#3b82f6', // Blue
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#ec4899', // Pink
  '#6366f1', // Indigo
];

export function CategoryBreakdown({ 
  data, 
  title = "Emissions by Category", 
  description = "Breakdown of your carbon footprint by food category" 
}: CategoryBreakdownProps) {
  const formatTooltip = (value: number, name: string) => {
    const percentage = data.find(item => item.category === name)?.percentage || 0;
    return [`${value.toFixed(2)} kg CO2e (${percentage.toFixed(1)}%)`, name];
  };

  const formatLegend = (value: string) => {
    const item = data.find(item => item.category === value);
    if (!item) return value;
    return `${value} (${item.percentage.toFixed(1)}%)`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ category, percentage }) => `${category} ${percentage.toFixed(1)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="emissions"
                nameKey="category"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip 
                formatter={formatTooltip}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend 
                formatter={formatLegend}
                layout="vertical"
                verticalAlign="middle"
                align="right"
                wrapperStyle={{
                  fontSize: '12px',
                  paddingLeft: '20px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {data.reduce((sum, item) => sum + item.emissions, 0).toFixed(1)}
            </p>
            <p className="text-sm text-muted-foreground">Total kg CO2e</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {data.length}
            </p>
            <p className="text-sm text-muted-foreground">Categories</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 