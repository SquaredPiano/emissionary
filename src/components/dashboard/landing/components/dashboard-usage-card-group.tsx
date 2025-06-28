import { Leaf, TrendingUp, TrendingDown, Scale, Globe, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

// TODO: Replace with actual data from backend API calls
const mockEmissionData = {
  totalEmissionsWeek: 12.4,
  weeklyAverage: 15.2,
  canadianAverage: 18.5,
  globalAverage: 22.1,
  highestItem: { name: 'Beef (500g)', emissions: 8.2 },
  lowestItem: { name: 'Bananas (1kg)', emissions: 0.8 }
};

const cards = [
  {
    title: "This Week's Emissions",
    icon: <Leaf className={'text-green-500'} size={18} />,
    value: `${mockEmissionData.totalEmissionsWeek} kg CO₂e`,
    change: `${mockEmissionData.totalEmissionsWeek < mockEmissionData.weeklyAverage ? '↓' : '↑'} ${Math.abs(mockEmissionData.totalEmissionsWeek - mockEmissionData.weeklyAverage).toFixed(1)} kg vs average`,
    trend: mockEmissionData.totalEmissionsWeek < mockEmissionData.weeklyAverage ? 'positive' : 'negative'
  },
  {
    title: "Weekly Average",
    icon: <Scale className={'text-blue-500'} size={18} />,
    value: `${mockEmissionData.weeklyAverage} kg CO₂e`,
    change: "Last 4 weeks",
    trend: 'neutral'
  },
  {
    title: "vs Canadian Average",
    icon: <Target className={'text-emerald-500'} size={18} />,
    value: `${mockEmissionData.canadianAverage} kg CO₂e`,
    change: `${mockEmissionData.totalEmissionsWeek < mockEmissionData.canadianAverage ? '↓' : '↑'} ${Math.abs(mockEmissionData.totalEmissionsWeek - mockEmissionData.canadianAverage).toFixed(1)} kg difference`,
    trend: mockEmissionData.totalEmissionsWeek < mockEmissionData.canadianAverage ? 'positive' : 'negative'
  },
  {
    title: "vs Global Average",
    icon: <Globe className={'text-yellow-500'} size={18} />,
    value: `${mockEmissionData.globalAverage} kg CO₂e`,
    change: `${mockEmissionData.totalEmissionsWeek < mockEmissionData.globalAverage ? '↓' : '↑'} ${Math.abs(mockEmissionData.totalEmissionsWeek - mockEmissionData.globalAverage).toFixed(1)} kg difference`,
    trend: mockEmissionData.totalEmissionsWeek < mockEmissionData.globalAverage ? 'positive' : 'negative'
  },
];

export function DashboardUsageCardGroup() {
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
