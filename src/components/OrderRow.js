'use client';

import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function OrderRow({ order, isExpanded, onToggle, onEdit }) {
  const statusLabel = order.status === 'finalizata' ? 'Finalizată' : 'În progres';
  const statusVariant = order.status === 'finalizata' ? 'status-finalizata' : 'status-in-progres';
  const [detailsOpen, setDetailsOpen] = useState(false);

  return (
    <div
      className={cn(
        'flex flex-col px-4 py-3 cursor-pointer transition-colors outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring md:flex-row md:items-center md:gap-x-2',
        isExpanded ? 'rounded-t-lg bg-accent/50' : 'rounded-lg'
      )}
      data-testid="order-row"
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={() => onToggle(order.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onToggle(order.id);
        }
      }}
    >
      {/* Primary row — always visible */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="w-3.5 shrink-0 text-xs text-muted-foreground">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="truncate text-base font-medium text-foreground">{order.name}</span>
        <Badge variant={statusVariant} data-testid="order-status" data-status={order.status}>
          {statusLabel}
        </Badge>
        <div className="flex shrink-0 items-center gap-1.5">
          <Badge
            variant={order.collected ? 'active' : 'muted'}
            data-testid="order-badge-collected"
            data-active={order.collected ? 'true' : 'false'}
          >
            Încasată
          </Badge>
          <Badge
            variant={order.delivered ? 'active' : 'muted'}
            data-testid="order-badge-delivered"
            data-active={order.delivered ? 'true' : 'false'}
          >
            Livrată
          </Badge>
        </div>

        {/* Hamburger — mobile only */}
        <button
          type="button"
          className="ml-auto shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
          aria-label={detailsOpen ? 'Ascunde detalii' : 'Arată detalii'}
          aria-expanded={detailsOpen}
          onClick={(e) => { e.stopPropagation(); setDetailsOpen((o) => !o); }}
        >
          {detailsOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
      </div>

      {/* Details row — collapsed on mobile by default, always visible on desktop */}
      <div
        className={cn(
          'shrink-0 pl-5 md:flex md:flex-row md:flex-wrap md:items-center md:gap-x-4 md:gap-y-1 md:pl-0',
          detailsOpen ? 'mt-2 flex flex-col gap-y-2' : 'hidden',
        )}
      >
        <div className="rounded-md border border-border px-3 py-1.5 text-center text-sm" data-testid="order-total">
          <span className="text-muted-foreground">Total: </span>
          <span className="font-medium text-foreground">{Number(order.total ?? 0).toFixed(2)} RON</span>
        </div>
        <div className="rounded-md border border-border px-3 py-1.5 text-center text-sm text-muted-foreground" data-testid="order-profit">
          Profit: {Number(order.profit ?? 0).toFixed(2)} RON
        </div>
        <div className="rounded-md border border-border px-3 py-1.5 text-center text-sm text-muted-foreground" data-testid="product-summary">
          {order.doneCount} / {order.productCount} realizate
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full md:w-auto"
          data-testid="order-edit"
          aria-label={`Editează produsele din comanda ${order.name}`}
          onClick={(e) => {
            e.stopPropagation();
            onEdit(order.id);
          }}
        >
          Editează
        </Button>
      </div>
    </div>
  );
}
