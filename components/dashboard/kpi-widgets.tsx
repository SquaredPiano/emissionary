import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Leaf, TrendingUp, TrendingDown, Scale } from 'lucide-react';
import type { ReceiptItem } from '@prisma/client';

interface KpiWidgetsProps {
  totalEmissionsWeek: number;
  weeklyAverage: number;
  highestItem?: ReceiptItem | null;
  lowestItem?: ReceiptItem | null;
}

export function KpiWidgets({ totalEmissionsWeek, weeklyAverage, highestItem, lowestItem }: KpiWidgetsProps) {
  const kpis = [
    {
      title: "This Week's Emissions",
      value: `${totalEmissionsWeek.toFixed(1)} kg`,
      icon: Leaf,
    },
    {
      title: 'Weekly Average (This Month)',
      value: `${weeklyAverage.toFixed(1)} kg`,
      icon: Scale,
    },
    {
      title: 'Highest Emission Item',
      value: highestItem?.item_name || 'N/A',
      subValue: highestItem ? `${Number(highestItem.emissions).toFixed(1)} kg` : '',
      icon: TrendingUp,
    },
    {
      title: 'Lowest Emission Item',
      value: lowestItem?.item_name || 'N/A',
      subValue: lowestItem ? `${Number(lowestItem.emissions).toFixed(1)} kg` : '',
      icon: TrendingDown,
    },
  ];

  return (
    <>
      {kpis.map((kpi, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
            <kpi.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate" title={kpi.value}>
              {kpi.value}
            </div>
            {kpi.subValue && <p className="text-xs text-muted-foreground">{kpi.subValue}</p>}
          </CardContent>
        </Card>
      ))}
    </>
  );
}
