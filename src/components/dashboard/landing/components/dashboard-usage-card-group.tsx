import { Leaf, TrendingUp, TrendingDown, Scale, Globe, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardUsageCardGroupProps {
  user?: any;
  stats?: any;
  emissions?: any;
}

// Fallback data when no real data is available
const getFallbackData = () => ({
  thisWeekEmissions: 12.4,
  weeklyAverage: 15.2,
  canadianAverage: 180, // From https://www.toronto.ca/legdocs/mmis/2023/ie/bgrd/backgroundfile-239047.pdf
  globalAverage: 154, // From https://www.futuretracker.com/post/what-is-your-food-footprint 
  highestItem: { name: 'Beef (500g)', emissions: 8.2 },
  lowestItem: { name: 'Bananas (1kg)', emissions: 0.8 }
});

export function DashboardUsageCardGroup({ user, stats, emissions }: DashboardUsageCardGroupProps) {
  // Use real data if available, otherwise fallback to mock data
  const emissionData = emissions ? {
    thisWeekEmissions: emissions.thisWeekEmissions || 0,
    weeklyAverage: emissions.weeklyAverage || 0,
    canadianAverage: 180, // From https://www.toronto.ca/legdocs/mmis/2023/ie/bgrd/backgroundfile-239047.pdf 
    globalAverage: 154, // From https://www.futuretracker.com/post/what-is-your-food-footprint 
    highestItem: { name: 'N/A', emissions: 0 },
    lowestItem: { name: 'N/A', emissions: 0 }
  } : getFallbackData();

  const cards = [
    {
      title: "This Week's Emissions",
      icon: <Leaf className={'text-green-500'} size={18} />,
      value: `${emissionData.thisWeekEmissions.toFixed(1)} kg CO₂e`,
      change: `${emissionData.thisWeekEmissions < emissionData.weeklyAverage ? '↓' : '↑'} ${Math.abs(emissionData.thisWeekEmissions - emissionData.weeklyAverage).toFixed(1)} kg vs average`,
      trend: emissionData.thisWeekEmissions < emissionData.weeklyAverage ? 'positive' : 'negative'
    },
    {
      title: "Weekly Average",
      icon: <Scale className={'text-blue-500'} size={18} />,
      value: `${emissionData.weeklyAverage.toFixed(1)} kg CO₂e`,
      change: "Last 4 weeks",
      trend: 'neutral'
    },
    {
      title: "vs Canadian Household Average",
      icon: <Target className={'text-emerald-500'} size={18} />,
      value: `${emissionData.canadianAverage} kg CO₂e`,
      change: `${emissionData.thisWeekEmissions < emissionData.canadianAverage ? '↓' : '↑'} ${Math.abs(emissionData.thisWeekEmissions - emissionData.canadianAverage).toFixed(1)} kg difference`,
      trend: emissionData.thisWeekEmissions < emissionData.canadianAverage ? 'positive' : 'negative'
    },
    {
      title: "vs Global Household Average",
      icon: <Globe className={'text-yellow-500'} size={18} />,
      value: `${emissionData.globalAverage} kg CO₂e`,
      change: `${emissionData.thisWeekEmissions < emissionData.globalAverage ? '↓' : '↑'} ${Math.abs(emissionData.thisWeekEmissions - emissionData.globalAverage).toFixed(1)} kg difference`,
      trend: emissionData.thisWeekEmissions < emissionData.globalAverage ? 'positive' : 'negative'
    },
  ];

  return (
    <>
      {cards.map((card) => (
        <Card
          key={card.title}
          className={
            'flex flex-col justify-between h-full w-full bg-background/70 border-none shadow-lg rounded-2xl p-6 transition-transform hover:scale-[1.02] hover:shadow-xl'
          }
        >
          <CardHeader className="p-0 space-y-0">
            <CardTitle className="flex justify-between items-center mb-6">
              <span className={'text-base leading-4 font-medium'}>{card.title}</span>
              {card.icon}
            </CardTitle>
            <CardDescription className={'text-[2rem] leading-[2.5rem] text-primary font-bold'}>{card.value}</CardDescription>
          </CardHeader>
          <CardContent className={'p-0'}>
            <div className={`text-sm leading-[14px] pt-2 font-medium ${
              card.trend === 'positive' ? 'text-green-500' : 
              card.trend === 'negative' ? 'text-red-500' : 
              'text-secondary'
            }`}>
              {card.change}
            </div>
          </CardContent>
        </Card>
      ))}
    </>
  );
}
