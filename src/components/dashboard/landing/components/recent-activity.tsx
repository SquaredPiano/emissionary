'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Receipt, Calendar, Store, Leaf } from 'lucide-react';

// Fallback data when no real data is available
const getFallbackData = () => [
  {
    id: '1',
    merchant: 'Walmart',
    date: '2024-01-15',
    total: 89.45,
    emissions: 12.4,
    items: 15,
    status: 'processed'
  },
  {
    id: '2',
    merchant: 'Sobeys',
    date: '2024-01-14',
    total: 67.23,
    emissions: 8.9,
    items: 12,
    status: 'processed'
  },
  {
    id: '3',
    merchant: 'Loblaws',
    date: '2024-01-13',
    total: 123.67,
    emissions: 18.2,
    items: 22,
    status: 'processing'
  },
  {
    id: '4',
    merchant: 'No Frills',
    date: '2024-01-12',
    total: 45.89,
    emissions: 6.1,
    items: 8,
    status: 'processed'
  }
];

interface RecentActivityProps {
  receipts?: any;
  highlightedReceiptId?: string;
}

export function RecentActivity({ receipts, highlightedReceiptId }: RecentActivityProps) {
  // Use real data if available, otherwise fallback to mock data
  const data = receipts?.data?.receipts ? 
    receipts.data.receipts.map((receipt: any) => ({
      id: receipt.id,
      merchant: receipt.merchant,
      date: receipt.date,
      total: Number(receipt.total),
      emissions: receipt.emissionsLog ? Number(receipt.emissionsLog.totalCO2) : 0,
      items: receipt.receiptItems?.length || 0,
      status: 'processed'
    })) : 
    getFallbackData();

  if (data.length === 0) {
    return (
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
          <CardDescription>Your latest receipt uploads and emissions</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-black dark:text-muted-foreground mb-2">📝</div>
            <p className="text-black dark:text-muted-foreground">No receipts uploaded yet</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Recent Activity</CardTitle>
        <CardDescription>Your latest receipt uploads and emissions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((activity: any) => (
            <div 
              key={activity.id} 
              className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                activity.id === highlightedReceiptId 
                  ? 'border-green-500 bg-green-500/10 hover:bg-green-500/20' 
                  : 'border-border/50 hover:bg-muted/50'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Receipt className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <Store className="h-3 w-3 text-black dark:text-muted-foreground" />
                    <span className="font-medium">{activity.merchant}</span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-black dark:text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-3 w-3" />
                      <span>{new Date(activity.date).toLocaleDateString()}</span>
                    </div>
                    <span>${activity.total.toFixed(2)}</span>
                    <span>{activity.items} items</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="flex items-center space-x-1">
                  <Leaf className="h-3 w-3 text-green-600" />
                  <span className="font-medium text-green-600">{activity.emissions.toFixed(1)} kg</span>
                </div>
                <Badge 
                  variant={activity.status === 'processed' ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {activity.status}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 