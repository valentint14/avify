'use client';

import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { SORT_OPTIONS } from '../lib/orderFilters.js';

const ALL = '__all__';

export default function OrderFilters({ filters, onChange, onReset, countyOptions, platformOptions }) {
  const filtersActive = Object.entries(filters).some(([k, v]) =>
    k === 'sort' ? v !== 'created_desc' : k !== 'clientSearch' && v !== ''
  );
  const isActive = filtersActive || filters.clientSearch !== '';

  function selectValue(v) { return v === '' ? ALL : v; }
  function handleSelect(key, v) { onChange(key, v === ALL ? '' : v); }

  return (
    <div className="mb-2 flex flex-col gap-2">

      {/* ── Căutare ── */}
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-3 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          id="filter-client"
          type="text"
          placeholder="Caută după client sau nume comandă…"
          value={filters.clientSearch}
          onChange={(e) => onChange('clientSearch', e.target.value)}
          className="border-0 bg-transparent px-3 py-1 shadow-none focus-visible:ring-0"
        />
        {filters.clientSearch && (
          <button
            type="button"
            className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onChange('clientSearch', '')}
            aria-label="Șterge căutarea"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Filtre + Sortare ── */}
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">Județ</span>
            <Select value={selectValue(filters.county)} onValueChange={(v) => handleSelect('county', v)}>
              <SelectTrigger data-testid="filter-county" className="w-full sm:min-w-[150px]" aria-label="Județ">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toate județele</SelectItem>
                {countyOptions.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">Platformă</span>
            <Select value={selectValue(filters.platform)} onValueChange={(v) => handleSelect('platform', v)}>
              <SelectTrigger data-testid="filter-platform" className="w-full sm:min-w-[150px]" aria-label="Platformă contact">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toate platformele</SelectItem>
                {platformOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">Încasare</span>
            <Select value={selectValue(filters.collected)} onValueChange={(v) => handleSelect('collected', v)}>
              <SelectTrigger data-testid="filter-collected" className="w-full sm:min-w-[130px]" aria-label="Încasare">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toate</SelectItem>
                <SelectItem value="true">Încasată</SelectItem>
                <SelectItem value="false">Neîncasată</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-muted-foreground">Livrare</span>
            <Select value={selectValue(filters.delivered)} onValueChange={(v) => handleSelect('delivered', v)}>
              <SelectTrigger data-testid="filter-delivered" className="w-full sm:min-w-[130px]" aria-label="Livrare">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Toate</SelectItem>
                <SelectItem value="true">Livrată</SelectItem>
                <SelectItem value="false">Nelivrată</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="col-span-2 flex flex-col gap-1.5 sm:ml-auto">
            <span className="text-sm font-medium text-muted-foreground">Sortare</span>
            <Select value={filters.sort} onValueChange={(v) => onChange('sort', v)}>
              <SelectTrigger className="w-full sm:min-w-[220px]" aria-label="Sortare">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {isActive && (
            <div className="col-span-2 sm:col-span-1 sm:self-end">
              <Button type="button" variant="outline" onClick={onReset} className="w-full sm:w-auto" data-testid="filter-reset">
                Resetează
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
