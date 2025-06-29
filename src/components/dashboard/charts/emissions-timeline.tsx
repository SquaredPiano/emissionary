'use client';

import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthlyEmissions } from '@/lib/database.types';

interface EmissionsTimelineProps {
  data: MonthlyEmissions[];
  title?: string;
  description?: string;
}

export function EmissionsTimeline({ 
  data, 
  title = "Emissions Over Time", 
  description = "Your carbon footprint trends" 
}: EmissionsTimelineProps) {
  const formatTooltip = (value: number, name: string) => {
    if (name === 'emissions') {
      return [`${value.toFixed(2)} kg CO2e`, 'Emissions'];
    }
    if (name === 'receipts') {
      return [value.toString(), 'Receipts'];
    }
    return [value, name];
  };

  const formatYAxis = (value: number) => {
    return `${value.toFixed(1)} kg`;
  };

  return (
    <Card className="bg-white/90 dark:bg-zinc-900/80 border border-muted shadow-lg rounded-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="month" 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis 
                stroke="#888888"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip 
                formatter={formatTooltip}
                labelStyle={{ color: '#888888' }}
                contentStyle={{
                  backgroundColor: 'white',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="emissions"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
                name="Emissions (kg CO2e)"
              />
              <Line
                type="monotone"
                dataKey="receipts"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 3 }}
                activeDot={{ r: 5, stroke: '#3b82f6', strokeWidth: 2 }}
                name="Receipts"
                yAxisId={1}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
} 