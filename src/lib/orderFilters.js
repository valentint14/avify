'use strict';

// Default (unfiltered) state for all filter + sort dimensions.
const DEFAULT_FILTERS = {
  clientSearch: '',
  county: '',
  platform: '',
  collected: '',
  delivered: '',
  sort: 'created_desc',
};

// Returns true if a tri-state boolean filter ('' | 'true' | 'false') matches the
// order's boolean value. Empty string means "no filter — always matches".
function matchesBoolean(filterValue, orderValue) {
  if (filterValue === '') return true;
  return Boolean(orderValue) === (filterValue === 'true');
}

/**
 * Filter a list of orders by the active filter dimensions, combined with AND
 * logic: an order is kept only if it satisfies every active filter.
 *
 * @param {object[]} orders - Full order list from the API.
 * @param {object} filters - FilterState (see DEFAULT_FILTERS).
 * @returns {object[]} Orders matching all active filters.
 */
function filterOrders(orders, filters = DEFAULT_FILTERS) {
  const search = (filters.clientSearch || '').trim().toLowerCase();

  return orders.filter((order) => {
    // Search — matches client name or order name, case-insensitive partial match.
    if (search !== '') {
      const inClient = order.client && String(order.client).toLowerCase().includes(search);
      const inName   = order.name   && String(order.name).toLowerCase().includes(search);
      if (!inClient && !inName) return false;
    }

    // County — exact match.
    if (filters.county !== '' && order.county !== filters.county) return false;

    // Contact platform — exact match.
    if (filters.platform !== '' && order.contactPlatform !== filters.platform) return false;

    // Collection / delivery status — tri-state boolean.
    if (!matchesBoolean(filters.collected, order.collected)) return false;
    if (!matchesBoolean(filters.delivered, order.delivered)) return false;

    return true;
  });
}

/**
 * Derive the distinct, sorted, non-empty values of a given field across all
 * orders — used to populate the county and platform dropdown options.
 *
 * @param {object[]} orders - Full order list.
 * @param {string} field - Order property name (e.g. 'county', 'contactPlatform').
 * @returns {string[]} Sorted distinct non-empty values.
 */
function deriveOptions(orders, field) {
  const values = new Set();
  for (const order of orders) {
    const value = order[field];
    if (value != null && value !== '') values.add(String(value));
  }
  return [...values].sort((a, b) => a.localeCompare(b, 'ro'));
}

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Dată adăugare: noi → vechi' },
  { value: 'created_asc',  label: 'Dată adăugare: vechi → noi' },
  { value: 'event_asc',    label: 'Eveniment: aproape → departe' },
  { value: 'event_desc',   label: 'Eveniment: departe → aproape' },
  { value: 'delivery_asc', label: 'Livrare: aproape → departe' },
  { value: 'delivery_desc',label: 'Livrare: departe → aproape' },
  { value: 'profit_desc',  label: 'Profit: mare → mic' },
  { value: 'profit_asc',   label: 'Profit: mic → mare' },
  { value: 'name_asc',     label: 'Nume: A → Z' },
  { value: 'name_desc',    label: 'Nume: Z → A' },
  { value: 'status_asc',   label: 'Status: în progres primele' },
  { value: 'status_desc',  label: 'Status: finalizate primele' },
];

function sortOrders(orders, sort = 'created_desc') {
  const arr = [...orders];

  // null dates sink to the bottom regardless of direction
  function cmpDate(a, b, field, dir) {
    const av = a[field] ?? null;
    const bv = b[field] ?? null;
    if (av === null && bv === null) return 0;
    if (av === null) return 1;
    if (bv === null) return -1;
    return dir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
  }

  switch (sort) {
    case 'created_asc':
      return arr.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? ''));
    case 'created_desc':
      return arr.sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    case 'event_asc':
      return arr.sort((a, b) => cmpDate(a, b, 'eventDate', 'asc'));
    case 'event_desc':
      return arr.sort((a, b) => cmpDate(a, b, 'eventDate', 'desc'));
    case 'delivery_asc':
      return arr.sort((a, b) => cmpDate(a, b, 'deliveryDate', 'asc'));
    case 'delivery_desc':
      return arr.sort((a, b) => cmpDate(a, b, 'deliveryDate', 'desc'));
    case 'profit_asc':
      return arr.sort((a, b) => (Number(a.profit) || 0) - (Number(b.profit) || 0));
    case 'profit_desc':
      return arr.sort((a, b) => (Number(b.profit) || 0) - (Number(a.profit) || 0));
    case 'name_asc':
      return arr.sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '', 'ro'));
    case 'name_desc':
      return arr.sort((a, b) => (b.name ?? '').localeCompare(a.name ?? '', 'ro'));
    case 'status_asc':
      // 'in_progres' before 'finalizata'
      return arr.sort((a, b) => (a.status === b.status ? 0 : a.status === 'finalizata' ? 1 : -1));
    case 'status_desc':
      return arr.sort((a, b) => (a.status === b.status ? 0 : a.status === 'finalizata' ? -1 : 1));
    default:
      return arr;
  }
}

function fmtDate(iso) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

/**
 * Returns { label, value } for the secondary sort badge shown on each OrderRow,
 * or null when no badge is needed (sort field is already visible in the row).
 */
function getSortBadge(sort, order) {
  switch (sort) {
    case 'event_asc':
    case 'event_desc': {
      const v = fmtDate(order.eventDate);
      return v ? { label: 'Eveniment', value: v } : null;
    }
    case 'delivery_asc':
    case 'delivery_desc': {
      const v = fmtDate(order.deliveryDate);
      return v ? { label: 'Livrare', value: v } : null;
    }
    case 'profit_asc':
    case 'profit_desc': {
      const p = Number(order.profit);
      return Number.isFinite(p) ? { label: 'Profit', value: `${p.toFixed(2)} RON` } : null;
    }
    // created_*, name_*, status_* — already visible or not useful as a badge
    default:
      return null;
  }
}

module.exports = { DEFAULT_FILTERS, filterOrders, sortOrders, getSortBadge, SORT_OPTIONS, deriveOptions };
