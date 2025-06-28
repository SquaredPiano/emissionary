import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Lightbulb, CheckCircle } from 'lucide-react';

const tips = [
  {
    tip: 'Swap beef for chicken in one meal this week to save ~20kg of CO2e.',
    completed: true,
  },
  {
    tip: 'Try oat milk instead of dairy milk. It has 70% lower emissions.',
    completed: false,
  },
  {
    tip: 'Buy local produce to reduce transportation emissions.',
    completed: false,
  },
];

export function ActionableTips() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Actionable Sustainability Tips</CardTitle>
        <CardDescription>Small changes, big impact. Based on your last receipt.</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {tips.map((item, index) => (
            <li key={index} className="flex items-start">
              {item.completed ? (
                <CheckCircle className="h-5 w-5 mr-3 mt-0.5 text-primary flex-shrink-0" />
              ) : (
                <Lightbulb className="h-5 w-5 mr-3 mt-0.5 text-yellow-500 flex-shrink-0" />
              )}
              <span className="text-sm text-muted-foreground">{item.tip}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
