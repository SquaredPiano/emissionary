'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Eye, Download, Trash2, Search, Filter, EyeOff, Undo2 } from 'lucide-react';
import { ReceiptStatus } from '@/lib/database.types';
import useSWR from 'swr';
import { getUserReceipts, deleteReceipt, updateReceiptStatus } from '@/lib/actions/receipts';
import { toast } from 'sonner';

// Define the Receipt type based on the database schema
interface Receipt {
  id: string;
  userId: string;
  imageUrl?: string | null;
  merchant: string;
  total: number | string;
  date: string;
  currency: string;
  taxAmount?: number | string | null;
  tipAmount?: number | string | null;
  paymentMethod?: string | null;
  receiptNumber?: string | null;
  totalCarbonEmissions: number | string;
  status: string; // Now this is a real database field
  createdAt: string;
  updatedAt: string;
  receiptItems?: ReceiptItem[];
}

interface ReceiptItem {
  id: string;
  receiptId: string;
  name: string;
  quantity: number | string;
  unitPrice: number | string;
  totalPrice: number | string;
  category?: string | null;
  brand?: string | null;
  barcode?: string | null;
  description?: string | null;
  carbonEmissions: number | string;
  confidence: number | string;
  createdAt: string;
  updatedAt: string;
  source?: string;
}

// Helper function to safely convert string/number to number
const toNumber = (value: number | string | null | undefined): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

// Helper function to safely format emissions
const formatEmissions = (value: number | string | null | undefined): string => {
  const num = toNumber(value);
  return num.toFixed(1);
};

export function HistoryTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch real receipts for the user
  const { data: receiptsData, mutate } = useSWR('user-receipts', async () => {
    const res = await getUserReceipts({ page: 1, limit: 100 });
    return res.data?.receipts || [];
  });
  const receipts = receiptsData || [];

  // Filter data based on search and status
  const filteredData = receipts
    .filter((item: Receipt) => {
      if (showDeleted) return item.status === 'deleted';
      return (
        item.status !== 'deleted' &&
        item.merchant.toLowerCase().includes(searchTerm.toLowerCase()) &&
        (statusFilter === 'all' || item.status === statusFilter)
      );
    })
    .sort((a: Receipt, b: Receipt) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'emissions':
          return toNumber(b.totalCarbonEmissions) - toNumber(a.totalCarbonEmissions);
        case 'total':
          return toNumber(b.total) - toNumber(a.total);
        default:
          return 0;
      }
    });

  const totalEmissions = filteredData.reduce(
    (sum: number, item: Receipt) => 
      sum + toNumber(item.totalCarbonEmissions),
    0
  );
  const averageEmissions = filteredData.length > 0 ? totalEmissions / filteredData.length : 0;

  const handleToggleHide = async (id: string, currentStatus: string) => {
    setIsLoading(true);
    try {
      const newStatus = currentStatus === ReceiptStatus.HIDDEN ? ReceiptStatus.PROCESSED : ReceiptStatus.HIDDEN;
      const result = await updateReceiptStatus({ receiptId: id, status: newStatus });
      
      if (result.success) {
        toast.success(`Receipt ${newStatus === ReceiptStatus.HIDDEN ? 'hidden' : 'unhidden'} successfully`);
        mutate(); // Refresh the data
      } else {
        toast.error(result.error || 'Failed to update receipt status');
      }
    } catch (error) {
      toast.error('An error occurred while updating receipt status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setIsLoading(true);
    try {
      const result = await deleteReceipt({ receiptId: id });
      
      if (result.success) {
        toast.success('Receipt deleted successfully');
        mutate(); // Refresh the data
        setConfirmDeleteId(null);
      } else {
        toast.error(result.error || 'Failed to delete receipt');
      }
    } catch (error) {
      toast.error('An error occurred while deleting receipt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (item: Receipt) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(item, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${item.merchant || 'receipt'}-${item.id}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Your Receipts</CardTitle>
        <CardDescription>
          Browse, manage, and analyze your uploaded receipts and their carbon emissions
        </CardDescription>
        <div className="mt-2 text-center">
          {showDeleted ? (
            <span className="text-sm text-muted-foreground">
              Viewing deleted items.{' '}
              <span
                className="underline cursor-pointer text-yellow-500 hover:text-yellow-600 transition-colors"
                onClick={() => setShowDeleted(false)}
              >
                View active items
              </span>
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Not seeing an item?{' '}
              <span
                className="underline cursor-pointer text-yellow-500 hover:text-yellow-600 transition-colors"
                onClick={() => setShowDeleted(true)}
              >
                View deleted items
              </span>
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{filteredData.length}</div>
            <div className="text-sm text-black dark:text-muted-foreground">Total Receipts</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{totalEmissions.toFixed(1)} kg</div>
            <div className="text-sm text-black dark:text-muted-foreground">Total Emissions</div>
          </div>
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="text-2xl font-bold">{averageEmissions.toFixed(1)} kg</div>
            <div className="text-sm text-black dark:text-muted-foreground">Average per Receipt</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 min-w-[700px] max-w-full">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by merchant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          {!showDeleted && (
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={ReceiptStatus.PROCESSED}>Processed</SelectItem>
                <SelectItem value={ReceiptStatus.PROCESSING}>Processing</SelectItem>
                <SelectItem value={ReceiptStatus.ERROR}>Error</SelectItem>
                <SelectItem value={ReceiptStatus.HIDDEN}>Hidden</SelectItem>
            </SelectContent>
          </Select>
          )}
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
        <div className="min-w-[700px] max-w-full overflow-x-auto max-h-[600px] overflow-y-auto">
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
              {filteredData.map((item: Receipt) => (
                <TableRow key={item.id} className={item.status === ReceiptStatus.HIDDEN ? 'opacity-50 bg-zinc-900/60 dark:bg-zinc-800/60' : ''}>
                  <TableCell className="font-medium">{item.merchant}</TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>${toNumber(item.total).toFixed(2)}</TableCell>
                  <TableCell>{item.receiptItems?.length || 0}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {formatEmissions(item.totalCarbonEmissions)} kg CO₂e
                    </Badge>
                    {'receiptItems' in item && Array.isArray(item.receiptItems) && 
                     item.receiptItems.some((receiptItem: ReceiptItem) => receiptItem.source) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const sourceCounts = item.receiptItems!.reduce((acc: Record<string, number>, receiptItem: ReceiptItem) => {
                            const source = receiptItem.source || 'unknown';
                            acc[source] = (acc[source] || 0) + 1;
                            return acc;
                          }, {});
                          return Object.entries(sourceCounts).map(([source, count]: [string, number]) => (
                            <span key={source} className="mr-1">
                              {source}: {count}
                            </span>
                          ));
                        })()}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={item.status === ReceiptStatus.PROCESSED ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleToggleHide(item.id, item.status)}
                        disabled={isLoading}
                      >
                        {item.status === ReceiptStatus.HIDDEN ? (
                          <EyeOff className="h-4 w-4 text-zinc-400" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDownload(item)}
                        disabled={isLoading}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700" 
                        onClick={() => setConfirmDeleteId(item.id)}
                        disabled={isLoading}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Confirmation Modal */}
        {confirmDeleteId && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-background p-6 rounded-lg shadow-lg flex flex-col items-center">
              <div className="mb-4 text-lg font-semibold">Are you sure you want to delete this receipt?</div>
              <div className="mb-2 text-sm text-muted-foreground">This action <b>cannot</b> be undone.</div>
              <div className="flex gap-4">
                <Button 
                  variant="destructive" 
                  onClick={() => handleDelete(confirmDeleteId)}
                  disabled={isLoading}
                >
                  {isLoading ? 'Deleting...' : 'Yes, delete'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {filteredData.length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">📄</div>
            <p className="text-black dark:text-muted-foreground">No receipts found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 