'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, TrendingDown, Leaf, Target } from 'lucide-react';

// Fallback tips when no real data is available
const getFallbackTips = () => [
  {
    id: '1',
    title: 'Switch to Plant-Based Alternatives',
    description: 'Your meat consumption contributes 45% to your emissions. Try replacing beef with lentils or chickpeas.',
    impact: 'High',
    savings: '12.8 kg CO₂e/week',
    category: 'diet'
  },
  {
    id: '2',
    title: 'Buy Local Produce',
    description: 'Choose locally grown vegetables to reduce transportation emissions.',
    impact: 'Medium',
    savings: '4.4 kg CO₂e/week',
    category: 'shopping'
  },
  {
    id: '3',
    title: 'Reduce Dairy Consumption',
    description: 'Consider almond or oat milk alternatives for your coffee and cereal.',
    impact: 'Medium',
    savings: '3.2 kg CO₂e/week',
    category: 'diet'
  },
  {
    id: '4',
    title: 'Bulk Buy Grains',
    description: 'Purchase rice, pasta, and other grains in bulk to reduce packaging waste.',
    impact: 'Low',
    savings: '1.2 kg CO₂e/week',
    category: 'shopping'
  }
];

interface ActionableTipsProps {
  emissions?: any;
}

export function ActionableTips({ emissions }: ActionableTipsProps) {
  // Generate personalized tips based on emissions data
  const generatePersonalizedTips = () => {
    if (!emissions?.categoryBreakdown) {
      return getFallbackTips();
    }

    const tips = [];
    const breakdown = emissions.categoryBreakdown;
    const totalEmissions = emissions.totalEmissions;

    // Tip for high meat consumption
    if (breakdown.meat && breakdown.meat.totalEmissions > totalEmissions * 0.3) {
      tips.push({
        id: '1',
        title: 'Reduce Meat Consumption',
        description: `Meat contributes ${Math.round((breakdown.meat.totalEmissions / totalEmissions) * 100)}% to your emissions. Try meatless Mondays or plant-based alternatives.`,
        impact: 'High',
        savings: `${((breakdown.meat.totalEmissions * 0.3) * 4).toFixed(1)} kg CO₂e/week`,
        category: 'diet'
      });
    }

    // Tip for high dairy consumption
    if (breakdown.dairy && breakdown.dairy.totalEmissions > totalEmissions * 0.2) {
      tips.push({
        id: '2',
        title: 'Switch to Plant-Based Dairy',
        description: 'Consider almond, oat, or soy milk alternatives to reduce dairy emissions.',
        impact: 'Medium',
        savings: `${((breakdown.dairy.totalEmissions * 0.4) * 4).toFixed(1)} kg CO₂e/week`,
        category: 'diet'
      });
    }

    // Tip for high processed food consumption
    if (breakdown.processed && breakdown.processed.totalEmissions > totalEmissions * 0.25) {
      tips.push({
        id: '3',
        title: 'Choose Whole Foods',
        description: 'Reduce packaged and processed foods in favor of whole, unprocessed ingredients.',
        impact: 'Medium',
        savings: `${((breakdown.processed.totalEmissions * 0.2) * 4).toFixed(1)} kg CO₂e/week`,
        category: 'diet'
      });
    }

    // Tip for low vegetable consumption
    if (!breakdown.vegetables || breakdown.vegetables.totalEmissions < totalEmissions * 0.1) {
      tips.push({
        id: '4',
        title: 'Increase Vegetable Intake',
        description: 'Vegetables have much lower emissions than animal products. Try adding more to your meals.',
        impact: 'Medium',
        savings: '6.0 kg CO₂e/week',
        category: 'diet'
      });
    }

    // Add general tips if we don't have enough personalized ones
    while (tips.length < 4) {
      const fallbackTips = getFallbackTips();
      const tip: any = fallbackTips[tips.length];
      if (tip && !tips.find(t => t.title === tip.title)) {
        tips.push(tip);
      }
    }

    return tips.slice(0, 4);
  };

  const tips = generatePersonalizedTips();

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'High': return 'text-red-600 bg-red-100';
      case 'Medium': return 'text-yellow-600 bg-yellow-100';
      case 'Low': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (tips.length === 0) {
    return (
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Sustainability Tips</CardTitle>
          <CardDescription>Personalized suggestions to reduce your carbon footprint</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground mb-2">💡</div>
            <p className="text-black dark:text-muted-foreground">Upload more receipts for personalized tips</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Sustainability Tips
        </CardTitle>
        <CardDescription>Personalized suggestions to reduce your carbon footprint</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {tips.map((tip, idx) => (
            <div key={`${tip.id}-${tip.title}-${idx}`} className="p-4 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors">
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-medium text-sm">{tip.title}</h4>
                <Badge 
                  variant="outline" 
                  className={`text-xs ${getImpactColor(tip.impact)}`}
                >
                  {tip.impact} Impact
                </Badge>
              </div>
              <p className="text-black dark:text-muted-foreground mb-3">{tip.description}</p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1 text-xs text-green-600">
                  <TrendingDown className="h-3 w-3" />
                  <span>Save {tip.savings}</span>
                </div>
                <Badge variant="secondary" className="text-xs">
                  {tip.category}
                </Badge>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2 text-sm text-green-700">
            <Target className="h-4 w-4" />
            <span className="font-medium">Your Goal:</span>
            <span>Reduce emissions by 20% this month</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 