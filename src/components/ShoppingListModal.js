'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function ShoppingListModal({ open, onClose }) {
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    async function fetchList() {
      setLoading(true);
      setError(null);
      try {
        const res  = await fetch('/api/shopping-list');
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Eroare server.');
        if (!cancelled) setResult(data);
      } catch (err) {
        if (!cancelled) setError(err.message || 'Eroare necunoscută.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchList();
    return () => { cancelled = true; };
  }, [open]);

  const toBuyRows    = result?.rows.filter((r) => r.toBuy > 0)  ?? [];
  const coveredRows  = result?.rows.filter((r) => r.toBuy === 0) ?? [];
  const noOrders     = result && result.rows.length === 0 && result.excludedCount === 0;
  const allCovered   = result && result.rows.length > 0 && toBuyRows.length === 0;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
        data-testid="shopping-list-modal"
      >
        <DialogHeader>
          <DialogTitle>Listă cumpărături</DialogTitle>
          {result && (
            <DialogDescription className="print:text-black">
              Comenzi în următoarele 30 de zile · Generat la{' '}
              {new Date(result.generatedAt).toLocaleString('ro-RO')}
            </DialogDescription>
          )}
        </DialogHeader>

        {loading && (
          <div
            className="flex flex-col items-center gap-3 py-8 text-muted-foreground"
            data-testid="shopping-list-loading"
          >
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <span className="text-sm">Se calculează lista...</span>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 py-8">
            <p className="text-sm text-destructive">Eroare la generarea listei. Încearcă din nou.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setError(null);
                setResult(null);
              }}
            >
              Reîncearcă
            </Button>
          </div>
        )}

        {!loading && !error && result && (
          <div className="flex flex-col gap-4">
            {result.excludedCount > 0 && (
              <p
                className="rounded-md border border-warn/40 bg-warn-bg px-3 py-2 text-sm text-warn-fg"
                data-testid="excluded-warning"
              >
                {result.excludedCount} produs(e) fără rețetă nu au putut fi calculate.
              </p>
            )}

            {noOrders && (
              <p
                className="py-8 text-center text-muted-foreground"
                data-testid="no-orders-message"
              >
                Nu există comenzi cu termen în următoarele 30 de zile.
              </p>
            )}

            {allCovered && (
              <p
                className="py-8 text-center text-muted-foreground"
                data-testid="all-covered-message"
              >
                Stocul existent acoperă toată producția planificată.
              </p>
            )}

            {toBuyRows.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  De cumpărat
                </p>
                <div className="rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/40">
                        <th className="px-3 py-2 text-left font-medium">Material</th>
                        <th className="px-3 py-2 text-right font-medium">Necesar total</th>
                        <th className="px-3 py-2 text-right font-medium">În stoc</th>
                        <th className="px-3 py-2 text-right font-medium text-primary">De cumpărat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {toBuyRows.map((row) => (
                        <tr
                          key={row.materialId}
                          className="border-b border-border last:border-0"
                          data-testid="shopping-list-row"
                        >
                          <td className="px-3 py-2 font-medium">{row.materialName}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {row.totalRequired.toLocaleString('ro-RO')} {row.unit ?? ''}
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {row.currentStock.toLocaleString('ro-RO')} {row.unit ?? ''}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-primary">
                            {row.toBuy.toLocaleString('ro-RO')} {row.unit ?? ''}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {coveredRows.length > 0 && (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Acoperit de stoc ({coveredRows.length})
                </p>
                <div className="rounded-md border border-border opacity-60">
                  <table className="w-full text-sm">
                    <tbody>
                      {coveredRows.map((row) => (
                        <tr
                          key={row.materialId}
                          className="border-b border-border last:border-0"
                        >
                          <td className="px-3 py-2">{row.materialName}</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {row.totalRequired.toLocaleString('ro-RO')} {row.unit ?? ''} necesar
                          </td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {row.currentStock.toLocaleString('ro-RO')} {row.unit ?? ''} în stoc
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="print:hidden">
          {!loading && !error && result && (
            <Button
              variant="outline"
              onClick={() => window.print()}
              data-testid="print-button"
              className="print:hidden"
            >
              Printează lista
            </Button>
          )}
          <Button variant="outline" onClick={onClose} className="print:hidden">
            Închide
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
