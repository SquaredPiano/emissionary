'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, Trash2, Search, Filter } from 'lucide-react';

// TODO: Replace with actual data from backend API calls
const mockHistoryData = [
  {
    id: '1',
    merchant: 'Walmart',
    date: '2024-01-15',
    total: 89.45,
    emissions: 12.4,
    items: 15,
    status: 'processed',
    imageUrl: '/placeholder.jpg'
  },
  {
    id: '2',
    merchant: 'Sobeys',
    date: '2024-01-14',
    total: 67.23,
    emissions: 8.9,
    items: 12,
    status: 'processed',
    imageUrl: '/placeholder.jpg'
  },
  {
    id: '3',
    merchant: 'Loblaws',
    date: '2024-01-13',
    total: 123.67,
    emissions: 18.2,
    items: 22,
    status: 'processed',
    imageUrl: '/placeholder.jpg'
  },
  {
    id: '4',
    merchant: 'No Frills',
    date: '2024-01-12',
    total: 45.89,
    emissions: 6.1,
    items: 8,
    status: 'processed',
    imageUrl: '/placeholder.jpg'
  },
  {
    id: '5',
    merchant: 'Metro',
    date: '2024-01-11',
    total: 78.34,
    emissions: 11.7,
    items: 18,
    status: 'processed',
    imageUrl: '/placeholder.jpg'
  }
];

export function HistoryTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const filteredData = mockHistoryData
    .filter(item => 
      item.merchant.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || item.status === statusFilter)
    )
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'emissions':
          return b.emissions - a.emissions;
        case 'total':
          return b.total - a.total;
        default:
          return 0;
      }
    });

  const totalEmissions = filteredData.reduce((sum, item) => sum + item.emissions, 0);
  const averageEmissions = filteredData.length > 0 ? totalEmissions / filteredData.length : 0;

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Receipt History</CardTitle>
        <CardDescription>
          View all your uploaded receipts and their carbon emissions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <div className="text-sm text-muted-foreground">Total Receipts</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{totalEmissions.toFixed(1)} kg</div>
            <div className="text-sm text-muted-foreground">Total Emissions</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{averageEmissions.toFixed(1)} kg</div>
            <div className="text-sm text-muted-foreground">Average per Receipt</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="processed">Processed</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="error">Error</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="emissions">Emissions</SelectItem>
              <SelectItem value="total">Total Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Merchant</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Emissions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.merchant}</TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>${item.total.toFixed(2)}</TableCell>
                  <TableCell>{item.items}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {item.emissions} kg CO₂e
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={item.status === 'processed' ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {filteredData.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">📄</div>
            <p className="text-muted-foreground">No receipts found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 