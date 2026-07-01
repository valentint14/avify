'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const STATUS_LABELS = {
  de_realizat: 'De realizat',
  in_realizare: 'În realizare',
  realizat: 'Realizat',
};

function MetaRow({ label, value }) {
  if (value == null || value === '' || value === 0) return null;
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </>
  );
}

export default function OrderDetailDialog({ event, onClose }) {
  const open = event !== null;
  const [products, setProducts] = useState(null);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    if (!event) {
      setProducts(null);
      return;
    }
    setLoadingProducts(true);
    fetch(`/api/products?orderId=${event.order.id}`)
      .then((r) => r.json())
      .then(({ products: p }) => {
        setProducts(p ?? []);
        setLoadingProducts(false);
      });
  }, [event]); // re-fetch whenever the selected event changes

  const order = event?.order;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{order?.name ?? ''}</DialogTitle>
          <DialogDescription asChild>
            <div>
              {event?.type === 'eveniment' ? (
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-medium px-2 py-0.5 rounded">
                  Eveniment
                </span>
              ) : (
                <span className="inline-block bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded">
                  Livrare
                </span>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <MetaRow label="Client" value={order?.client} />
          <MetaRow label="Județ" value={order?.county} />
          <MetaRow label="Platformă" value={order?.contactPlatform} />
          <MetaRow label="Dată eveniment" value={order?.eventDate} />
          <MetaRow label="Termen livrare" value={order?.deliveryDate} />
          <MetaRow label="Avans" value={order?.advance > 0 ? `${order.advance} RON` : null} />
          <MetaRow label="Profit" value={order?.profit > 0 ? `${order.profit} RON` : null} />
          <MetaRow label="Colectat" value={order != null ? (order.collected ? 'Da' : 'Nu') : null} />
          <MetaRow label="Livrat" value={order != null ? (order.delivered ? 'Da' : 'Nu') : null} />
        </dl>

        <div>
          <h3 className="text-sm font-semibold mb-2 mt-2">Produse</h3>
          {loadingProducts && (
            <div className="space-y-1">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-3/4" />
            </div>
          )}
          {!loadingProducts && products?.length === 0 && (
            <p className="text-sm text-muted-foreground">Această comandă nu are produse.</p>
          )}
          {!loadingProducts && products && products.length > 0 && (
            <ul className="space-y-1">
              {products.map((p) => (
                <li
                  key={p.id}
                  className="flex justify-between text-sm border-b border-border py-1 last:border-0"
                >
                  <span>
                    {p.name}{' '}
                    <span className="text-muted-foreground text-xs">
                      ({STATUS_LABELS[p.status] ?? p.status})
                    </span>
                  </span>
                  <span className="text-muted-foreground shrink-0 pl-2">
                    {p.quantity} × {p.unitPrice} RON
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <DialogFooter className="mt-2">
          <DialogClose asChild>
            <Button variant="outline" onClick={onClose}>Închide</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
