'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import DateInput from '@/components/ui/date-input';

const CONTACT_PLATFORMS = ['Facebook', 'Instagram', 'TikTok', 'Telefon', 'Email'];
const NONE = '__none__';

const EMPTY_ORDER_FIELDS = {
  client: '',
  receptionDate: '',
  advance: '',
  county: '',
  contactPlatform: '',
  eventDate: '',
  deliveryDate: '',
  profit: '',
  collected: false,
  delivered: false,
};

export default function EditOrderModal({ orderId, onClose, onSaved, onDelete }) {
  const [products, setProducts] = useState([]);
  const [edits, setEdits] = useState({});
  const [orderFields, setOrderFields] = useState(EMPTY_ORDER_FIELDS);
  const [orderName, setOrderName] = useState('');
  const [customPlatform, setCustomPlatform] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/products?orderId=${orderId}`).then((r) => r.json()),
      fetch('/api/orders').then((r) => r.json()),
    ])
      .then(([{ products: list }, { orders }]) => {
        setProducts(list ?? []);
        const order = (orders ?? []).find((o) => o.id === orderId);
        if (order) {
          setOrderName(order.name ?? '');
          const platform = order.contactPlatform ?? '';
          setCustomPlatform(platform !== '' && !CONTACT_PLATFORMS.includes(platform));
          setOrderFields({
            client: order.client || order.name || '',
            receptionDate: order.receptionDate ?? '',
            advance: order.advance ? String(order.advance) : '',
            county: order.county ?? '',
            contactPlatform: platform,
            eventDate: order.eventDate ?? '',
            deliveryDate: order.deliveryDate ?? '',
            profit: order.profit ? String(order.profit) : '',
            collected: Boolean(order.collected),
            delivered: Boolean(order.delivered),
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Nu s-au putut încărca datele comenzii.');
        setLoading(false);
      });
  }, [orderId]);

  function handleChange(productId, field, value) {
    setEdits((prev) => ({ ...prev, [productId]: { ...prev[productId], [field]: value } }));
  }

  function setField(field, value) {
    setOrderFields((prev) => ({ ...prev, [field]: value }));
  }

  function handlePlatformSelect(value) {
    if (value === 'Altele') {
      setCustomPlatform(true);
      setField('contactPlatform', '');
    } else {
      setCustomPlatform(false);
      setField('contactPlatform', value === NONE ? '' : value);
    }
  }

  function currentValue(product, field) {
    const edit = edits[product.id];
    if (edit && field in edit) return edit[field];
    if (field === 'quantity') return product.quantity;
    if (field === 'unitPrice') return product.unitPrice ?? 0;
    return product.additionalInfo ?? '';
  }

  const liveTotal = products.reduce((sum, p) => {
    const qty = Number(currentValue(p, 'quantity')) || 0;
    const price = Number(currentValue(p, 'unitPrice')) || 0;
    return sum + qty * price;
  }, 0);

  async function handleSave() {
    const dirty = products.filter((p) => {
      const e = edits[p.id];
      if (!e) return false;
      const qtyChanged = e.quantity !== undefined && Number(e.quantity) !== p.quantity;
      const infoChanged = e.additionalInfo !== undefined && e.additionalInfo !== (p.additionalInfo ?? '');
      const priceChanged = e.unitPrice !== undefined && Number(e.unitPrice) !== (p.unitPrice ?? 0);
      return qtyChanged || infoChanged || priceChanged;
    });

    for (const p of dirty) {
      const e = edits[p.id];
      const qty = e.quantity !== undefined ? Number(e.quantity) : p.quantity;
      if (!Number.isFinite(qty) || qty < 1) {
        setError(`Cantitatea pentru "${p.name}" trebuie să fie un număr întreg pozitiv.`);
        return;
      }
      const price = e.unitPrice !== undefined ? Number(e.unitPrice) : p.unitPrice ?? 0;
      if (!Number.isFinite(price) || price < 0) {
        setError(`Prețul unitar pentru "${p.name}" trebuie să fie un număr pozitiv.`);
        return;
      }
    }

    setSaving(true);
    setError('');
    try {
      const orderBody = {
        client: orderFields.client || null,
        receptionDate: orderFields.receptionDate || null,
        advance: orderFields.advance === '' ? 0 : Number(orderFields.advance),
        county: orderFields.county || null,
        contactPlatform: orderFields.contactPlatform || null,
        eventDate: orderFields.eventDate || null,
        deliveryDate: orderFields.deliveryDate || null,
        profit: orderFields.profit === '' ? 0 : Number(orderFields.profit),
        collected: orderFields.collected,
        delivered: orderFields.delivered,
      };
      const orderRes = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderBody),
      });
      if (!orderRes.ok) {
        const data = await orderRes.json();
        setError(data.error || 'Eroare la salvarea comenzii.');
        return;
      }

      for (const p of dirty) {
        const e = edits[p.id];
        const body = {};
        if (e.quantity !== undefined) body.quantity = Math.trunc(Number(e.quantity));
        if (e.additionalInfo !== undefined) body.additionalInfo = e.additionalInfo || null;
        if (e.unitPrice !== undefined) body.unitPrice = Number(e.unitPrice);
        const res = await fetch(`/api/products/${p.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          setError(data.error || 'Eroare la salvarea produsului.');
          return;
        }
      }
      onSaved();
      onClose();
    } catch {
      setError('Eroare la salvarea comenzii.');
    } finally {
      setSaving(false);
    }
  }

  async function performDelete() {
    setDeleting(true);
    setError('');
    try {
      await onDelete(orderId);
      onClose();
    } catch {
      setError('Eroare la ștergerea comenzii.');
      setDeleting(false);
    }
  }

  const busy = saving || deleting;
  const fieldCls = 'flex flex-col gap-1.5';

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        className="flex max-h-[85vh] flex-col gap-0 p-0 sm:max-w-2xl"
        data-testid="edit-order-modal"
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-14">
          <DialogTitle>Editează comanda</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
        {loading && <p className="py-6 text-sm text-muted-foreground">Se încarcă…</p>}

        {!loading && (
          <div className="flex flex-col gap-6">
            {/* Order details */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Detalii comandă</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className={fieldCls}>
                  <Label htmlFor="ord-client">Client</Label>
                  <Input id="ord-client" value={orderFields.client} onChange={(e) => setField('client', e.target.value)} disabled={saving} />
                </div>
                <div className={fieldCls}>
                  <Label htmlFor="ord-county">Județ</Label>
                  <Input id="ord-county" value={orderFields.county} onChange={(e) => setField('county', e.target.value)} disabled={saving} />
                </div>
                <div className={fieldCls}>
                  <Label htmlFor="ord-reception">Dată primire</Label>
                  <DateInput id="ord-reception" value={orderFields.receptionDate} onChange={(v) => setField('receptionDate', v)} disabled={saving} />
                </div>
                <div className={fieldCls}>
                  <Label htmlFor="ord-event">Dată eveniment</Label>
                  <DateInput id="ord-event" value={orderFields.eventDate} onChange={(v) => setField('eventDate', v)} disabled={saving} />
                </div>
                <div className={fieldCls}>
                  <Label htmlFor="ord-delivery">Termen livrare</Label>
                  <DateInput id="ord-delivery" value={orderFields.deliveryDate} onChange={(v) => setField('deliveryDate', v)} disabled={saving} />
                </div>
                <div className={fieldCls}>
                  <Label htmlFor="ord-advance">Avans (RON)</Label>
                  <Input id="ord-advance" type="number" min="0" step="0.01" value={orderFields.advance} onChange={(e) => setField('advance', e.target.value)} disabled={saving} />
                </div>
                <div className={fieldCls}>
                  <Label htmlFor="ord-profit">Profit (RON)</Label>
                  <Input id="ord-profit" type="number" step="0.01" value={orderFields.profit} onChange={(e) => setField('profit', e.target.value)} disabled={saving} />
                </div>
                <div className={fieldCls}>
                  <Label>Platformă contact</Label>
                  <Select
                    value={customPlatform ? 'Altele' : (orderFields.contactPlatform || NONE)}
                    onValueChange={handlePlatformSelect}
                    disabled={saving}
                  >
                    <SelectTrigger data-testid="ord-platform" aria-label="Platformă contact">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>—</SelectItem>
                      {CONTACT_PLATFORMS.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                      <SelectItem value="Altele">Altele</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {customPlatform && (
                  <div className={`${fieldCls} sm:col-span-2`}>
                    <Label htmlFor="ord-platform-custom">Platformă personalizată</Label>
                    <Input
                      id="ord-platform-custom"
                      value={orderFields.contactPlatform}
                      onChange={(e) => setField('contactPlatform', e.target.value)}
                      disabled={saving}
                      placeholder="ex. WhatsApp"
                    />
                  </div>
                )}
                <div className="flex items-center gap-6 sm:col-span-2">
                  <label className="flex items-center gap-2 text-sm" data-testid="order-check-collected">
                    <Checkbox
                      checked={orderFields.collected}
                      onCheckedChange={(v) => setField('collected', Boolean(v))}
                      disabled={saving}
                    />
                    Încasată
                  </label>
                  <label className="flex items-center gap-2 text-sm" data-testid="order-check-delivered">
                    <Checkbox
                      checked={orderFields.delivered}
                      onCheckedChange={(v) => setField('delivered', Boolean(v))}
                      disabled={saving}
                    />
                    Livrată
                  </label>
                </div>
              </div>
            </section>

            {/* Products */}
            <section>
              <h3 className="mb-3 text-sm font-semibold text-foreground">Produse</h3>
              {products.length === 0 && <p className="text-sm text-muted-foreground">Niciun produs în această comandă.</p>}
              {products.length > 0 && (
                <div className="flex flex-col gap-3">
                  {products.map((p) => (
                    <div key={p.id} className="rounded-md border border-border p-3" data-testid="product-line" data-product-name={p.name}>
                      <p className="mb-2 font-medium">{p.name}</p>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className={fieldCls}>
                          <Label htmlFor={`qty-${p.id}`}>Cantitate</Label>
                          <Input id={`qty-${p.id}`} type="number" min="1" data-testid="product-qty" value={currentValue(p, 'quantity')} onChange={(e) => handleChange(p.id, 'quantity', e.target.value)} disabled={saving} />
                        </div>
                        <div className={fieldCls}>
                          <Label htmlFor={`price-${p.id}`}>Preț unitar (RON)</Label>
                          <Input id={`price-${p.id}`} type="number" min="0" step="0.01" data-testid="product-price" value={currentValue(p, 'unitPrice')} onChange={(e) => handleChange(p.id, 'unitPrice', e.target.value)} disabled={saving} />
                        </div>
                        <div className={`${fieldCls} sm:col-span-2`}>
                          <Label htmlFor={`info-${p.id}`}>Informații suplimentare</Label>
                          <Textarea id={`info-${p.id}`} rows={2} value={currentValue(p, 'additionalInfo')} onChange={(e) => handleChange(p.id, 'additionalInfo', e.target.value)} disabled={saving} placeholder="Culori, fonturi, text personalizat…" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-sm text-muted-foreground">Total comandă:</span>
                <strong data-testid="order-total-live">{liveTotal.toFixed(2)} RON</strong>
              </div>
            </section>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
        </div>

        <div className="shrink-0 flex flex-col gap-2 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="text-destructive" data-testid="order-delete" disabled={busy || loading}>
                Șterge comanda
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Ștergi comanda {orderName ? `„${orderName}"` : 'aceasta'}?
                </AlertDialogTitle>
                <AlertDialogDescription>Toate produsele vor fi șterse.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Anulează</AlertDialogCancel>
                <AlertDialogAction data-testid="order-delete-confirm" onClick={performDelete} disabled={deleting}>
                  {deleting ? 'Se șterge…' : 'Confirmă ștergerea'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex flex-col gap-2 sm:ml-auto sm:flex-row">
            <Button variant="outline" onClick={onClose} disabled={busy}>Anulează</Button>
            <Button onClick={handleSave} disabled={busy || loading} data-testid="order-save">
              {saving ? 'Se salvează…' : 'Salvează'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
