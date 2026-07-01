'use client';

import { useState, useCallback } from 'react';
import { RefreshCw, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ProductionQueue({ initialGroups, initialFetchedAt }) {
  const [groups, setGroups]       = useState(initialGroups);
  const [fetchedAt, setFetchedAt] = useState(initialFetchedAt);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  const handleRefresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch('/api/mod-productie');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Eroare la încărcarea datelor.');
        return;
      }
      setGroups(data.groups);
      setFetchedAt(data.fetchedAt);
    } catch {
      setError('Nu s-a putut contacta serverul. Verificați conexiunea.');
    } finally {
      setLoading(false);
    }
  }, []);

  function toggleGroup(key) {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  const formattedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('ro-RO')
    : null;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-4 p-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight">Mod producție</h1>
        <div className="flex items-center gap-3">
          {formattedTime && (
            <span className="text-sm text-muted-foreground">
              Actualizat la {formattedTime}
            </span>
          )}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            aria-label="Reîncarcă coada de producție"
            className="inline-flex items-center justify-center rounded-md border border-border bg-card p-2 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="flex items-center justify-between rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <span>{error}</span>
          <button
            type="button"
            onClick={handleRefresh}
            className="ml-4 font-medium underline underline-offset-2 hover:no-underline"
          >
            Reîncearcă
          </button>
        </div>
      )}

      {/* Empty state */}
      {!error && groups.length === 0 && (
        <p className="py-12 text-center text-muted-foreground">
          Nicio comandă nu are produse de realizat.
        </p>
      )}

      {/* Production groups */}
      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          {groups.map((group) => {
            const isExpanded = expandedKeys.has(group.key);
            const ordersId   = `${group.key}-orders`;
            return (
              <div
                key={group.key}
                data-testid="production-group"
                className="rounded-lg border border-border bg-card shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => toggleGroup(group.key)}
                  aria-expanded={isExpanded}
                  aria-controls={ordersId}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <ChevronDown
                      className={cn(
                        'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
                        isExpanded && 'rotate-180'
                      )}
                    />
                    <span className="truncate font-medium">{group.label}</span>
                  </div>
                  <span className="shrink-0 rounded-full bg-primary px-2.5 py-0.5 text-sm font-semibold text-primary-foreground">
                    {group.totalQuantity.toLocaleString('ro-RO')} buc
                  </span>
                </button>

                {isExpanded && (
                  <ul
                    id={ordersId}
                    role="list"
                    data-testid="orders-list"
                    className="border-t border-border px-4 pb-3 pt-2"
                  >
                    {group.orders.map((order) => (
                      <li
                        key={order.orderId}
                        className="flex items-center justify-between py-1.5 text-sm"
                      >
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="font-medium truncate">{order.orderName}</span>
                          {order.client && (
                            <span className="text-xs text-muted-foreground truncate">
                              {order.client}
                            </span>
                          )}
                        </div>
                        <span className="ml-4 shrink-0 tabular-nums text-muted-foreground">
                          {order.quantity.toLocaleString('ro-RO')} buc
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
