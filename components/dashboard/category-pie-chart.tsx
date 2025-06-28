'use client';

import { Pie, PieChart, Cell } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

interface CategoryPieChartProps {
  data: {
    category: string | null;
    _sum: {
      emissions: number | null;
    };
  }[];
}

const CHART_COLORS = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  const chartData = data
    .filter((item) => item._sum.emissions && item._sum.emissions > 0)
    .map((item, index) => ({
      name: item.category || 'Other',
      value: Number(item._sum.emissions),
      fill: CHART_COLORS[index % CHART_COLORS.length],
    }));

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Emissions by Category</CardTitle>
          <CardDescription>Breakdown of your carbon footprint by food type.</CardDescription>
        </CardHeader>
        <CardContent className="h-[250px] flex items-center justify-center">
          <p className="text-muted-foreground text-center">No category data available. Upload a receipt to start.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Emissions by Category</CardTitle>
        <CardDescription>Breakdown of your carbon footprint by food type.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={{}} className="mx-auto aspect-square h-[250px]">
          <PieChart>
            <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <ChartLegend
              content={<ChartLegendContent nameKey="name" payload={[]} />}
              className="-translate-y-[10px] flex-wrap gap-2 [&>*]:basis-1/4 [&>*]:justify-center"
            />
          </PieChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
