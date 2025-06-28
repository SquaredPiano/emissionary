import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Users, Globe, Target } from 'lucide-react';

interface ComparativeMetricsProps {
  weeklyEmissions: number;
}

export function ComparativeMetrics({ weeklyEmissions }: ComparativeMetricsProps) {
  const metrics = [
    {
      label: 'vs. Canadian Average',
      userValue: weeklyEmissions,
      averageValue: 45.0, // Static value from research
      unit: 'kg/week',
      icon: Users,
    },
    {
      label: 'vs. Global Average',
      userValue: weeklyEmissions,
      averageValue: 32.5, // Static value from research
      unit: 'kg/week',
      icon: Globe,
    },
    {
      label: 'Your Goal (25kg/week)',
      userValue: weeklyEmissions,
      averageValue: 25.0, // User-defined goal
      unit: 'kg/week',
      icon: Target,
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Comparative Metrics</CardTitle>
        <CardDescription>How you stack up against others and your goals.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {metrics.map((metric, index) => {
          const isGoal = metric.label.includes('Goal');
          const progressValue = isGoal
            ? (metric.averageValue / (metric.userValue || 1)) * 100
            : (metric.userValue / metric.averageValue) * 100;
          const isOver = metric.userValue > metric.averageValue;

          return (
            <div key={index}>
              <div className="flex items-center justify-between text-sm mb-1">
                <div className="flex items-center">
                  <metric.icon className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span>{metric.label}</span>
                </div>
                <span className="font-medium">
                  {metric.userValue.toFixed(1)}
                  {isGoal ? '' : ` / ${metric.averageValue.toFixed(1)}`} {metric.unit}
                </span>
              </div>
              <Progress
                value={Math.min(100, progressValue)}
                className={isGoal && isOver ? '[&>div]:bg-destructive' : ''}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
