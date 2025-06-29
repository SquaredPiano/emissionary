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

const merchants = ['Walmart', 'Sobeys', 'Loblaws', 'No Frills', 'Metro'];
const mockHistoryData = Array.from({ length: 50 }, (_, i) => {
  const merchant = merchants[i % merchants.length];
  return {
    id: (i + 1).toString(),
    merchant,
    date: `2024-01-${(15 - (i % 5)).toString().padStart(2, '0')}`,
    total: Math.round(Math.random() * 10000 + 2000) / 100,
    emissions: Math.round((Math.random() * 200 + 50)) / 10,
    items: Math.floor(Math.random() * 20 + 5),
    status: ReceiptStatus.PROCESSED,
    imageUrl: '/placeholder.jpg',
  };
});

export function HistoryTable() {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);
  const [showDeleted, setShowDeleted] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);

  // Add hidden and deleted status to data
  const dataWithStatus = mockHistoryData.map(item => {
    if (deletedIds.includes(item.id)) {
      return { ...item, status: 'deleted', prevStatus: item.status };
    }
    if (hiddenIds.includes(item.id)) {
      return { ...item, status: ReceiptStatus.HIDDEN, prevStatus: item.status };
    }
    return item;
  });

  const filteredData = dataWithStatus
    .filter(item => {
      if (showDeleted) return item.status === 'deleted';
      return (
        item.status !== 'deleted' &&
      item.merchant.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (statusFilter === 'all' || item.status === statusFilter)
      );
    })
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

  const handleToggleHide = (id: string) => {
    setHiddenIds((prev) =>
      prev.includes(id) ? prev.filter((hid) => hid !== id) : [...prev, id]
    );
  };

  const handleSoftDelete = (id: string) => {
    setDeletedIds((prev) => [...prev, id]);
  };

  const handleRestore = (id: string) => {
    setDeletedIds((prev) => prev.filter((did) => did !== id));
  };

  const handlePermanentDelete = (id: string) => {
    setDeletedIds((prev) => prev.filter((did) => did !== id));
    // Optionally, also remove from mockHistoryData if you want true deletion
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    if (e.shiftKey || showDeleted) {
      setConfirmDeleteId(id);
    } else {
      handleSoftDelete(id);
    }
  };

  const handleDownload = (item: any) => {
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
        {showDeleted && (
          <div className="flex justify-end items-center mt-2 mb-2">
            <Button
              variant="destructive"
              size="sm"
              className="px-3 py-1 text-xs"
              onClick={() => setConfirmDeleteAll(true)}
              disabled={filteredData.length === 0}
              style={filteredData.length === 0 ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            >
              Permanently Delete All
            </Button>
          </div>
        )}
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
              {filteredData.map((item) => (
                <TableRow key={item.id} className={item.status === ReceiptStatus.HIDDEN ? 'opacity-50 bg-zinc-900/60 dark:bg-zinc-800/60' : item.status === 'deleted' ? 'opacity-60 bg-red-900/30 dark:bg-red-800/30' : ''}>
                  <TableCell className="font-medium">{item.merchant}</TableCell>
                  <TableCell>{new Date(item.date).toLocaleDateString()}</TableCell>
                  <TableCell>${item.total.toFixed(2)}</TableCell>
                  <TableCell>{item.items}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      {item.emissions.toFixed(1)} kg CO₂e
                    </Badge>
                    {'receiptItems' in item && Array.isArray(item.receiptItems) && 
                     item.receiptItems.some((receiptItem: any) => receiptItem.source) && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {(() => {
                          const sourceCounts = item.receiptItems.reduce((acc: any, receiptItem: any) => {
                            const source = receiptItem.source || 'unknown';
                            acc[source] = (acc[source] || 0) + 1;
                            return acc;
                          }, {});
                          return Object.entries(sourceCounts).map(([source, count]: [string, any]) => (
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
                      {item.status !== 'deleted' ? (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleToggleHide(item.id)}>
                            {item.status === ReceiptStatus.HIDDEN ? (
                              <EyeOff className="h-4 w-4 text-zinc-400" />
                            ) : (
                        <Eye className="h-4 w-4" />
                            )}
                      </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleDownload(item)}>
                        <Download className="h-4 w-4" />
                      </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={(e) => handleDeleteClick(item.id, e)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button variant="ghost" size="sm" onClick={() => handleRestore(item.id)}>
                            <Undo2 className="h-4 w-4 text-green-500" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => setConfirmDeleteId(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                        </>
                      )}
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
              <div className="mb-4 text-lg font-semibold">Are you sure you want to permanently delete this entry?</div>
              <div className="flex gap-4">
                <Button variant="destructive" onClick={() => { handlePermanentDelete(confirmDeleteId); setConfirmDeleteId(null); }}>
                  Yes, delete
                </Button>
                <Button variant="outline" onClick={() => setConfirmDeleteId(null)}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Delete All Confirmation Modal */}
        {confirmDeleteAll && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/40">
            <div className="bg-background p-6 rounded-lg shadow-lg flex flex-col items-center">
              <div className="mb-4 text-lg font-semibold text-red-600">Are you sure you want to permanently delete ALL deleted items?</div>
              <div className="mb-2 text-sm text-muted-foreground">This action <b>cannot</b> be undone.</div>
              <div className="flex gap-4">
                <Button variant="destructive" onClick={() => { setDeletedIds([]); setConfirmDeleteAll(false); }}>
                  Yes, delete all
                </Button>
                <Button variant="outline" onClick={() => setConfirmDeleteAll(false)}>
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