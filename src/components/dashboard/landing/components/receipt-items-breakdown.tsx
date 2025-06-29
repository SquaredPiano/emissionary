'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Leaf, Package, DollarSign } from 'lucide-react';

interface ReceiptItem {
  id?: string;
  name: string;
  canonical_name?: string;
  quantity: number;
  total_price?: number;
  category: string;
  carbon_emissions: number;
  confidence?: number;
  source: string;
  is_food?: boolean;
}

interface ReceiptItemsBreakdownProps {
  items: ReceiptItem[];
  title?: string;
  description?: string;
}

const getSourceColor = (source: string) => {
  switch (source) {
    case 'dataset':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'ai_estimation':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'groq_ai':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'fallback':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getSourceIcon = (source: string) => {
  switch (source) {
    case 'dataset':
      return '📊';
    case 'ai_estimation':
      return '🤖';
    case 'groq_ai':
      return '🧠';
    case 'fallback':
      return '🔄';
    default:
      return '❓';
  }
};

export function ReceiptItemsBreakdown({ 
  items, 
  title = "Receipt Items Breakdown", 
  description = "Detailed view of items and their emission sources" 
}: ReceiptItemsBreakdownProps) {
  if (!items || items.length === 0) {
    return (
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <div className="text-center">
            <div className="text-muted-foreground mb-2">📝</div>
            <p className="text-muted-foreground">No items to display</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalEmissions = items.reduce((sum, item) => sum + (item.carbon_emissions || 0), 0);
  const totalPrice = items.reduce((sum, item) => sum + (item.total_price || 0), 0);
  const sourceBreakdown = items.reduce((acc, item) => {
    const source = item.source || 'unknown';
    acc[source] = (acc[source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
        
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalEmissions.toFixed(1)}</div>
            <div className="text-sm text-muted-foreground">Total kg CO₂e</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">${totalPrice.toFixed(2)}</div>
            <div className="text-sm text-muted-foreground">Total Price</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{items.length}</div>
            <div className="text-sm text-muted-foreground">Items</div>
          </div>
        </div>

        {/* Source Breakdown */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">Emission Sources:</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(sourceBreakdown).map(([source, count]) => (
              <Badge 
                key={source} 
                variant="outline" 
                className={getSourceColor(source)}
              >
                {getSourceIcon(source)} {source}: {count}
              </Badge>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {items.map((item, index) => (
            <div key={item.id || index} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{item.name}</span>
                  <Badge 
                    variant="outline" 
                    className={`text-xs ${getSourceColor(item.source)}`}
                  >
                    {getSourceIcon(item.source)} {item.source}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    <span>{item.category}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span>Qty: {item.quantity}</span>
                  </div>
                  {item.total_price && (
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      <span>${item.total_price.toFixed(2)}</span>
                    </div>
                  )}
                  {item.confidence && (
                    <span>Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="flex items-center gap-1 text-green-600 font-medium">
                  <Leaf className="h-4 w-4" />
                  <span>{item.carbon_emissions.toFixed(2)} kg</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  CO₂e
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 