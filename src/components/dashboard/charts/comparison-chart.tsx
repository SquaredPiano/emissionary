'use client';

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ComparisonChartProps {
  userEmissions: number;
  canadianAverage: number;
  title?: string;
  description?: string;
  timePeriod?: 'day' | 'week' | 'month' | 'year';
}

export function ComparisonChart({ 
  userEmissions, 
  canadianAverage, 
  title = "Comparison with Canadian Average", 
  description = "How your emissions compare to the national average",
  timePeriod = 'year'
}: ComparisonChartProps) {
  const data = [
    {
      name: 'Your Emissions',
      emissions: userEmissions,
      fill: '#10b981',
    },
    {
      name: 'Canadian Average',
      emissions: canadianAverage,
      fill: '#3b82f6',
    },
  ];

  const difference = userEmissions - canadianAverage;
  const percentageDifference = ((difference / canadianAverage) * 100);
  
  const getTrendIcon = () => {
    if (percentageDifference > 5) {
      return <TrendingUp className="h-4 w-4 text-red-500" />;
    } else if (percentageDifference < -5) {
      return <TrendingDown className="h-4 w-4 text-green-500" />;
    } else {
      return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getTrendText = () => {
    if (percentageDifference > 5) {
      return `${Math.abs(percentageDifference).toFixed(1)}% above average`;
    } else if (percentageDifference < -5) {
      return `${Math.abs(percentageDifference).toFixed(1)}% below average`;
    } else {
      return 'Close to average';
    }
  };

  const getTrendColor = () => {
    if (percentageDifference > 5) {
      return 'text-red-600';
    } else if (percentageDifference < -5) {
      return 'text-green-600';
    } else {
      return 'text-yellow-600';
    }
  };

  const formatTooltip = (value: number, name: string) => {
    return [`${value.toFixed(2)} kg CO2e`, name];
  };

  const formatYAxis = (value: number) => {
    return `${value.toFixed(1)} kg`;
  };

  const getTimePeriodLabel = () => {
    switch (timePeriod) {
      case 'day': return 'per day';
      case 'week': return 'per week';
      case 'month': return 'per month';
      case 'year': return 'per year';
      default: return 'per year';
    }
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
            <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="name" 
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
              <Bar 
                dataKey="emissions" 
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Comparison summary */}
        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">
                Your emissions {getTimePeriodLabel()}
              </p>
              <p className="text-2xl font-bold text-green-600">
                {userEmissions.toFixed(1)} kg CO2e
              </p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                {getTrendIcon()}
                <span className={`text-sm font-medium ${getTrendColor()}`}>
                  {getTrendText()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                vs {canadianAverage.toFixed(1)} kg CO2e average
              </p>
            </div>
          </div>
        </div>

        {/* Environmental impact */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <p className="text-lg font-bold text-green-700">
              {Math.abs(difference).toFixed(1)}
            </p>
            <p className="text-xs text-green-600">
              kg CO2e {difference > 0 ? 'more' : 'less'} than average
            </p>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-lg font-bold text-blue-700">
              {Math.abs(percentageDifference).toFixed(1)}%
            </p>
            <p className="text-xs text-blue-600">
              {percentageDifference > 0 ? 'Above' : 'Below'} average
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 