'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function OrderRow({ order, isExpanded, onToggle, onEdit }) {
  const statusLabel = order.status === 'finalizata' ? 'Finalizată' : 'În progres';
  const statusVariant = order.status === 'finalizata' ? 'status-finalizata' : 'status-in-progres';

  return (
    <div
      className={cn(
        'flex cursor-pointer items-center gap-2 px-4 py-3 transition-colors outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring',
        isExpanded && 'bg-accent/50'
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
      <span className="w-3.5 shrink-0 text-xs text-muted-foreground">{isExpanded ? '▼' : '▶'}</span>

      <div className="flex min-w-0 flex-1 items-center gap-2">
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
      </div>

      <div className="flex shrink-0 items-center gap-4">
        <span className="whitespace-nowrap text-sm font-medium text-foreground" data-testid="order-total">
          <span className="font-normal text-muted-foreground">Total: </span>
          {Number(order.total ?? 0).toFixed(2)} RON
        </span>
        <span className="whitespace-nowrap text-sm text-muted-foreground" data-testid="order-profit">
          <span className="text-muted-foreground">Profit: </span>
          {Number(order.profit ?? 0).toFixed(2)} RON
        </span>
        <span className="text-sm text-muted-foreground" data-testid="product-summary">
          {order.doneCount} / {order.productCount} gata
        </span>
        <Button
          variant="outline"
          size="sm"
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
