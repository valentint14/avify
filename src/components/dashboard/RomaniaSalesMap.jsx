'use client';

import { useState, useMemo } from 'react';
import { ROMANIA_COUNTIES } from './romania-counties-paths.js';
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';

function countyFill(value, maxValue) {
  if (!value || !maxValue) return 'hsl(215, 15%, 88%)';
  const lightness = Math.round(70 - (value / maxValue) * 32);
  return `hsl(220, 85%, ${lightness}%)`;
}

export default function RomaniaSalesMap({ countyData }) {
  const [metric, setMetric] = useState('orders');

  const dataMap = useMemo(
    () => new Map(countyData.map((d) => [d.county, d])),
    [countyData]
  );

  const maxValue = useMemo(() => {
    if (!countyData.length) return 0;
    return Math.max(
      ...countyData.map((d) =>
        metric === 'orders' ? d.deliveredCount : d.totalProfit
      )
    );
  }, [countyData, metric]);

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {[
          { key: 'orders', label: 'Comenzi' },
          { key: 'profit', label: 'Profit' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setMetric(key)}
            className={
              metric === key
                ? 'rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                : 'rounded-md border border-input px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            }
          >
            {label}
          </button>
        ))}
      </div>

      <TooltipProvider delayDuration={0}>
        <svg
          viewBox="0 0 613 433"
          width="100%"
          preserveAspectRatio="xMidYMid meet"
          aria-label="Harta vânzărilor pe județe"
          role="img"
        >
          {ROMANIA_COUNTIES.map(({ id, name, d }) => {
            const entry = dataMap.get(name);
            const value = entry
              ? metric === 'orders'
                ? entry.deliveredCount
                : entry.totalProfit
              : 0;
            return (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <path
                    d={d}
                    fill={countyFill(value, maxValue)}
                    stroke="hsl(215, 15%, 70%)"
                    strokeWidth={0.8}
                    data-county={name}
                    aria-label={name}
                    className="cursor-pointer transition-opacity hover:opacity-80"
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="font-semibold">{name}</p>
                  <p>{entry ? entry.deliveredCount : 0} comenzi livrate</p>
                  <p>{(entry ? entry.totalProfit : 0).toFixed(2)} RON</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </svg>
      </TooltipProvider>
    </div>
  );
}
