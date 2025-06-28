import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { Receipt } from '@prisma/client';
import { format } from 'date-fns';

interface RecentActivityProps {
  receipts: Receipt[];
}

export function RecentActivity({ receipts }: RecentActivityProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center">
        <div className="grid gap-2">
          <CardTitle>Recent Receipts</CardTitle>
          <CardDescription>Your recently analyzed grocery hauls.</CardDescription>
        </div>
        <Button asChild size="sm" className="ml-auto gap-1">
          <Link href="/history">
            View All
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Store</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Emissions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {receipts.length > 0 ? (
              receipts.map((receipt) => (
                <TableRow key={receipt.id}>
                  <TableCell>
                    <div className="font-medium">{receipt.store_name}</div>
                  </TableCell>
                  <TableCell>{format(new Date(receipt.created_at), 'PPP')}</TableCell>
                  <TableCell className="text-right">{Number(receipt.total_emissions).toFixed(1)} kg</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="text-center h-24">
                  No receipts found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
