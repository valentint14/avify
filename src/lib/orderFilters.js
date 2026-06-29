'use strict';

// Default (unfiltered) state for all five filter dimensions. Single source of
// truth used both to initialise filter state and to implement the reset action.
const DEFAULT_FILTERS = {
  clientSearch: '',
  county: '',
  platform: '',
  collected: '',
  delivered: '',
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
    // Client name — case-insensitive partial match. Orders with no client name
    // are excluded whenever a non-empty search term is present.
    if (search !== '') {
      if (!order.client) return false;
      if (!String(order.client).toLowerCase().includes(search)) return false;
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

module.exports = { DEFAULT_FILTERS, filterOrders, deriveOptions };
