'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import OrderDetailDialog from '@/components/calendar/OrderDetailDialog';

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'];

const daysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
// Maps JS getDay() (Sun=0) to Monday-first offset: Mon=0 … Sun=6
const startOffset = (y, m) => (new Date(y, m, 1).getDay() + 6) % 7;

function isoDate(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function buildGrid(year, month) {
  const totalDays = daysInMonth(year, month);
  const offset = startOffset(year, month);
  const cells = [];

  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const prevTotal = daysInMonth(prevYear, prevMonth);
  for (let i = offset - 1; i >= 0; i--) {
    const d = prevTotal - i;
    cells.push({ day: d, isCurrentMonth: false, dateISO: isoDate(prevYear, prevMonth, d) });
  }

  for (let d = 1; d <= totalDays; d++) {
    cells.push({ day: d, isCurrentMonth: true, dateISO: isoDate(year, month, d) });
  }

  const nextMonth = month === 11 ? 0 : month + 1;
  const nextYear = month === 11 ? year + 1 : year;
  let d = 1;
  while (cells.length < 42) {
    cells.push({ day: d, isCurrentMonth: false, dateISO: isoDate(nextYear, nextMonth, d) });
    d++;
  }

  return cells;
}

function deriveEvents(orders) {
  const events = [];
  for (const order of orders) {
    if (order.eventDate) events.push({ order, date: order.eventDate, type: 'eveniment' });
    if (order.deliveryDate) events.push({ order, date: order.deliveryDate, type: 'livrare' });
  }
  return events;
}

function chipClass(type) {
  return type === 'eveniment'
    ? 'bg-blue-100 text-blue-800 border border-blue-200'
    : 'bg-amber-100 text-amber-700 border border-amber-200';
}

function truncate(str, max = 22) {
  return str.length > max ? str.slice(0, max) + '…' : str;
}

export default function CalendarGrid({ orders }) {
  const now = new Date();
  const [{ year, month }, setYearMonth] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);


  const isoPrefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const todayISO = now.toISOString().slice(0, 10);

  const allEvents = deriveEvents(orders).filter((e) => e.date.startsWith(isoPrefix));
  const eventsByDate = new Map();
  for (const e of allEvents) {
    if (!eventsByDate.has(e.date)) eventsByDate.set(e.date, []);
    eventsByDate.get(e.date).push(e);
  }

  const grid = buildGrid(year, month);

  const headingText = new Intl.DateTimeFormat('ro-RO', { month: 'long', year: 'numeric' })
    .format(new Date(year, month))
    .replace(/^\w/, (c) => c.toUpperCase());

  function handlePrev() {
    setYearMonth(({ year: y, month: m }) =>
      m === 0 ? { year: y - 1, month: 11 } : { year: y, month: m - 1 }
    );
  }
  function handleNext() {
    setYearMonth(({ year: y, month: m }) =>
      m === 11 ? { year: y + 1, month: 0 } : { year: y, month: m + 1 }
    );
  }
  function handleToday() {
    const d = new Date();
    setYearMonth({ year: d.getFullYear(), month: d.getMonth() });
  }

  return (
    <div className="mx-auto max-w-6xl p-6" data-hydrated={hydrated ? 'true' : undefined}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold tracking-tight">{headingText}</h1>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handlePrev}>
            Luna anterioară
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={handleToday}>
            Azi
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={handleNext}>
            Luna următoare
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-center text-xs font-medium text-muted-foreground py-1">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {grid.map((cell, idx) => {
          if (!cell.isCurrentMonth) {
            return <div key={idx} className="h-20 rounded-lg bg-muted/30 p-1" />;
          }

          const cellEvents = eventsByDate.get(cell.dateISO) ?? [];
          const visible = cellEvents.slice(0, 3);
          const overflow = cellEvents.length - 3;

          return (
            <div
              key={idx}
              className={`h-20 rounded-lg border border-border bg-card p-1 overflow-hidden flex flex-col gap-0.5${
                cell.dateISO === todayISO ? ' ring-2 ring-primary ring-offset-1' : ''
              }`}
            >
              <span
                className={`text-xs font-semibold leading-none mb-0.5 ${
                  cell.dateISO === todayISO ? 'text-primary' : 'text-foreground'
                }`}
              >
                {cell.day}
              </span>
              {visible.map((e, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setSelectedEvent(e)}
                  className={`w-full text-left text-xs px-1 py-0.5 rounded truncate cursor-pointer ${chipClass(e.type)}`}
                >
                  {e.type === 'eveniment' ? 'Ev' : 'Liv'}: {truncate(e.order.name)}
                </button>
              ))}
              {overflow > 0 && (
                <span className="text-xs text-muted-foreground pl-1">+{overflow} alte</span>
              )}
            </div>
          );
        })}
      </div>

      <OrderDetailDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
    </div>
  );
}
