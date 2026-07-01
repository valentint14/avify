'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, ChevronUp, Link, Copy, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function OrderRow({ order, isExpanded, onToggle, onEdit }) {
  const statusLabel = order.status === 'finalizata' ? 'Finalizată' : 'În progres';
  const statusVariant = order.status === 'finalizata' ? 'status-finalizata' : 'status-in-progres';
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [approvalLink, setApprovalLink] = useState(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/orders/${order.id}/approval-token`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.token) {
          setApprovalLink(`${window.location.origin}/aprobare/${data.token.id}`);
        }
      })
      .catch(() => {});
  }, [order.id]);

  async function handleGenerateLink(e) {
    e.stopPropagation();
    setLinkLoading(true);
    try {
      const res = await fetch(`/api/orders/${order.id}/approval-token`, { method: 'POST' });
      if (res.ok) {
        const { token } = await res.json();
        setApprovalLink(`${window.location.origin}/aprobare/${token.id}`);
        setCopied(false);
      }
    } finally {
      setLinkLoading(false);
    }
  }

  async function handleCopy(e) {
    e.stopPropagation();
    await navigator.clipboard.writeText(approvalLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className={cn(
        'flex flex-col cursor-pointer transition-colors outline-none hover:bg-accent/50 focus-visible:ring-2 focus-visible:ring-ring',
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
      <div className="flex min-w-0 items-center gap-2 px-4 py-2.5">
        <span className="w-3.5 shrink-0 text-xs text-muted-foreground">
          {isExpanded ? '▼' : '▶'}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{order.name}</span>
        <Badge variant={statusVariant} data-testid="order-status" data-status={order.status}>
          {statusLabel}
        </Badge>
        <button
          type="button"
          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
          aria-label={detailsOpen ? 'Ascunde detalii' : 'Arată detalii'}
          aria-expanded={detailsOpen}
          onClick={(e) => { e.stopPropagation(); setDetailsOpen((o) => !o); }}
        >
          {detailsOpen ? <ChevronUp className="h-4 w-4" /> : <MoreHorizontal className="h-4 w-4" />}
        </button>
      </div>

      {/* Secondary row — revealed by ⋯ button */}
      <div
        className={cn(
          'grid transition-[grid-template-rows] duration-200 ease-in-out',
          (detailsOpen || isExpanded) ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        )}
      >
        <div className="overflow-hidden">
        <div
          className="flex flex-col gap-1.5 border-t border-border px-4 py-2.5 md:flex-row md:flex-wrap md:items-center md:justify-between md:gap-x-3 md:gap-y-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={cn('w-full rounded-md border px-3 py-2 text-center text-sm md:w-auto', order.collected ? 'border-green-300 bg-green-50 text-green-800' : 'border-border text-muted-foreground')}
            data-testid="order-badge-collected"
            data-active={order.collected ? 'true' : 'false'}
          >
            Încasată
          </div>
          <div
            className={cn('w-full rounded-md border px-3 py-2 text-center text-sm md:w-auto', order.delivered ? 'border-green-300 bg-green-50 text-green-800' : 'border-border text-muted-foreground')}
            data-testid="order-badge-delivered"
            data-active={order.delivered ? 'true' : 'false'}
          >
            Livrată
          </div>
          <div className="w-full rounded-md border border-border px-3 py-2 text-center text-sm md:w-auto" data-testid="order-total">
            <span className="text-muted-foreground">Total: </span>
            <span className="font-medium text-foreground">{Number(order.total ?? 0).toFixed(2)} RON</span>
          </div>
          <div className="w-full rounded-md border border-border px-3 py-2 text-center text-sm text-muted-foreground md:w-auto" data-testid="order-profit">
            Profit: {Number(order.profit ?? 0).toFixed(2)} RON
          </div>
          <div className="w-full rounded-md border border-border px-3 py-2 text-center text-sm text-muted-foreground md:w-auto" data-testid="product-summary">
            {order.doneCount} / {order.productCount} realizate
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full md:w-auto"
            data-testid="order-edit"
            aria-label={`Editează produsele din comanda ${order.name}`}
            onClick={(e) => { e.stopPropagation(); onEdit(order.id); }}
          >
            Editează
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="w-full md:w-auto"
            data-testid="order-generate-link"
            disabled={linkLoading}
            onClick={handleGenerateLink}
          >
            <Link className="h-3.5 w-3.5 mr-1.5" />
            {linkLoading ? 'Se generează…' : 'Link aprobare'}
          </Button>
          {approvalLink && (
            <div
              className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Link className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground" title={approvalLink}>
                {approvalLink}
              </span>
              <button
                type="button"
                className="shrink-0 rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={copied ? 'Copiat!' : 'Copiază link'}
                onClick={handleCopy}
              >
                {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}
