'use client';

import { useState } from 'react';
import { CheckCircle, FileText, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ApprovalClientView({ order, products, tokenId }) {
  const [approvedIds, setApprovedIds] = useState(
    () => new Set(products.filter((p) => p.approved).map((p) => p.id))
  );
  const [submittedRevisions, setSubmittedRevisions] = useState(
    () => new Set(products.filter((p) => p.hasRevision).map((p) => p.id))
  );
  const [revisionTexts, setRevisionTexts] = useState({});
  const [approveLoading, setApproveLoading] = useState({});
  const [revisionLoading, setRevisionLoading] = useState({});
  const [approveErrors, setApproveErrors] = useState({});
  const [revisionErrors, setRevisionErrors] = useState({});

  async function handleApprove(productId) {
    setApproveLoading((prev) => ({ ...prev, [productId]: true }));
    setApproveErrors((prev) => ({ ...prev, [productId]: null }));
    try {
      const res = await fetch(`/api/aprobare/${tokenId}/${productId}`, { method: 'POST' });
      if (res.ok) {
        setApprovedIds((prev) => new Set([...prev, productId]));
      } else {
        setApproveErrors((prev) => ({ ...prev, [productId]: 'Eroare la aprobare. Încercați din nou.' }));
      }
    } catch {
      setApproveErrors((prev) => ({ ...prev, [productId]: 'Eroare la aprobare. Încercați din nou.' }));
    } finally {
      setApproveLoading((prev) => ({ ...prev, [productId]: false }));
    }
  }

  async function handleRequestRevision(productId) {
    const feedback = (revisionTexts[productId] ?? '').trim();
    if (!feedback) return;
    setRevisionLoading((prev) => ({ ...prev, [productId]: true }));
    setRevisionErrors((prev) => ({ ...prev, [productId]: null }));
    try {
      const res = await fetch(`/api/aprobare/${tokenId}/${productId}/revision`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback }),
      });
      if (res.ok) {
        setSubmittedRevisions((prev) => new Set([...prev, productId]));
        setRevisionTexts((prev) => ({ ...prev, [productId]: '' }));
      } else if (res.status === 409) {
        setApprovedIds((prev) => new Set([...prev, productId]));
      } else {
        setRevisionErrors((prev) => ({ ...prev, [productId]: 'Eroare la trimitere. Încercați din nou.' }));
      }
    } catch {
      setRevisionErrors((prev) => ({ ...prev, [productId]: 'Eroare la trimitere. Încercați din nou.' }));
    } finally {
      setRevisionLoading((prev) => ({ ...prev, [productId]: false }));
    }
  }

  const productsWithFile = products.filter((p) => p.hasFile);
  const allApproved = productsWithFile.length > 0 && productsWithFile.every((p) => approvedIds.has(p.id));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900" data-testid="approval-order-name">
            {order.name}
          </h1>
          {order.client && (
            <p className="mt-1 text-sm text-gray-500">Client: {order.client}</p>
          )}
          <p className="mt-2 text-sm text-gray-600">
            Revizuiți produsele de mai jos și aprobați designul sau solicitați modificări.
          </p>
          {allApproved && (
            <div
              className="mt-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800"
              data-testid="all-approved-banner"
            >
              <CheckCircle className="h-4 w-4 shrink-0" />
              Toate produsele au fost aprobate!
            </div>
          )}
        </div>

        {/* Product cards */}
        <div className="flex flex-col gap-4">
          {products.map((product) => {
            const isApproved = approvedIds.has(product.id);
            const revisionSubmitted = submittedRevisions.has(product.id);

            return (
              <div
                key={product.id}
                data-testid={`product-card-${product.id}`}
                className={cn(
                  'rounded-lg border bg-white p-5 shadow-sm transition-colors',
                  isApproved ? 'border-green-500 bg-green-50' : 'border-gray-200'
                )}
              >
                {/* Product name + quantity */}
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-semibold text-gray-900">{product.name}</h2>
                    <p className="text-xs text-gray-500">Cantitate: {product.quantity}</p>
                  </div>
                  {isApproved && (
                    <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      <CheckCircle className="h-3 w-3" />
                      Aprobat
                    </span>
                  )}
                </div>

                {/* File preview */}
                {product.hasFile && product.fileType === 'image' && (
                  <div className="mb-4 overflow-hidden rounded border border-gray-200">
                    <img
                      src={`/api/products/${product.id}/attachment`}
                      alt={`Design grafic: ${product.name}`}
                      className="max-h-80 w-full object-contain bg-gray-50"
                    />
                  </div>
                )}
                {product.hasFile && product.fileType === 'pdf' && (
                  <div className="mb-4 flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-4 py-3">
                    <FileText className="h-5 w-5 shrink-0 text-gray-500" />
                    <a
                      href={`/api/products/${product.id}/attachment`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
                    >
                      Vizualizați fișierul PDF
                    </a>
                  </div>
                )}
                {product.hasFile && product.fileType === 'other' && (
                  <div className="mb-4 flex items-center gap-2 rounded border border-gray-200 bg-gray-50 px-4 py-3">
                    <FileText className="h-5 w-5 shrink-0 text-gray-500" />
                    <a
                      href={`/api/products/${product.id}/attachment`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-blue-600 underline hover:text-blue-800"
                    >
                      Descărcați fișierul grafic
                    </a>
                  </div>
                )}

                {/* Actions */}
                {isApproved ? (
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white opacity-90 cursor-not-allowed"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Design aprobat ✓
                  </button>
                ) : !product.hasFile ? (
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      disabled
                      data-testid={`approve-btn-${product.id}`}
                      className="flex w-full items-center justify-center gap-1.5 rounded-md border border-gray-200 bg-gray-100 px-4 py-2.5 text-sm font-medium text-gray-400 cursor-not-allowed"
                    >
                      <ImageOff className="h-4 w-4" />
                      Aprobă design
                    </button>
                    <p className="text-center text-xs text-gray-400">Niciun fișier atașat</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    {/* Approve */}
                    <button
                      type="button"
                      data-testid={`approve-btn-${product.id}`}
                      disabled={approveLoading[product.id]}
                      onClick={() => handleApprove(product.id)}
                      className="flex w-full items-center justify-center rounded-md bg-green-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      {approveLoading[product.id] ? 'Se aprobă...' : 'Aprobă design'}
                    </button>
                    {approveErrors[product.id] && (
                      <p className="text-center text-xs text-red-600">{approveErrors[product.id]}</p>
                    )}

                    {/* Divider */}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 border-t border-gray-200" />
                      <span className="text-xs text-gray-400">sau</span>
                      <div className="flex-1 border-t border-gray-200" />
                    </div>

                    {/* Request revision */}
                    {revisionSubmitted ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-800">
                        Modificările au fost trimise. Studioul va reveni cu un design actualizat.
                      </div>
                    ) : (
                      <div className="flex flex-col gap-2">
                        <p className="text-sm font-medium text-gray-700">Solicită modificări</p>
                        <textarea
                          rows={3}
                          placeholder="Descrieți modificările dorite..."
                          value={revisionTexts[product.id] ?? ''}
                          onChange={(e) =>
                            setRevisionTexts((prev) => ({ ...prev, [product.id]: e.target.value }))
                          }
                          className="w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm placeholder:text-gray-400 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                        />
                        {revisionErrors[product.id] && (
                          <p className="text-xs text-red-600">{revisionErrors[product.id]}</p>
                        )}
                        <button
                          type="button"
                          disabled={!(revisionTexts[product.id] ?? '').trim() || revisionLoading[product.id]}
                          onClick={() => handleRequestRevision(product.id)}
                          className="flex w-full items-center justify-center rounded-md border border-amber-400 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {revisionLoading[product.id] ? 'Se trimite...' : 'Trimite modificări'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
