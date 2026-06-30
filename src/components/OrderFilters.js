'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';

// Radix Select disallows empty-string item values, so map "no filter" to a
// sentinel internally and convert back to '' for the parent filter state.
const ALL = '__all__';

export default function OrderFilters({ filters, onChange, onReset, countyOptions, platformOptions }) {
  const isActive = Object.values(filters).some((v) => v !== '');

  function selectValue(v) {
    return v === '' ? ALL : v;
  }
  function handleSelect(key, v) {
    onChange(key, v === ALL ? '' : v);
  }

  return (
    <div className="mb-2 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
        <label className="text-sm font-medium text-muted-foreground" htmlFor="filter-client">
          Caută client
        </label>
        <Input
          id="filter-client"
          type="text"
          placeholder="Nume client…"
          value={filters.clientSearch}
          onChange={(e) => onChange('clientSearch', e.target.value)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Județ</span>
        <Select value={selectValue(filters.county)} onValueChange={(v) => handleSelect('county', v)}>
          <SelectTrigger data-testid="filter-county" className="min-w-[160px]" aria-label="Județ">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toate județele</SelectItem>
            {countyOptions.map((county) => (
              <SelectItem key={county} value={county}>{county}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Platformă contact</span>
        <Select value={selectValue(filters.platform)} onValueChange={(v) => handleSelect('platform', v)}>
          <SelectTrigger data-testid="filter-platform" className="min-w-[160px]" aria-label="Platformă contact">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toate platformele</SelectItem>
            {platformOptions.map((platform) => (
              <SelectItem key={platform} value={platform}>{platform}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-muted-foreground">Încasare</span>
        <Select value={selectValue(filters.collected)} onValueChange={(v) => handleSelect('collected', v)}>
          <SelectTrigger data-testid="filter-collected" className="min-w-[140px]" aria-label="Încasare">
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
          <SelectTrigger data-testid="filter-delivered" className="min-w-[140px]" aria-label="Livrare">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Toate</SelectItem>
            <SelectItem value="true">Livrată</SelectItem>
            <SelectItem value="false">Nelivrată</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isActive && (
        <Button type="button" variant="outline" onClick={onReset} data-testid="filter-reset">
          Resetează filtrele
        </Button>
      )}
    </div>
  );
}
