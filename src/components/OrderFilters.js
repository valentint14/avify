'use client';

import '../styles/order-filters.css';

export default function OrderFilters({ filters, onChange, onReset, countyOptions, platformOptions }) {
  const isActive = Object.values(filters).some((v) => v !== '');

  return (
    <div className={`order-filters${isActive ? ' order-filters--active' : ''}`}>
      <div className="order-filters__control order-filters__control--search">
        <label className="order-filters__label" htmlFor="filter-client">
          Caută client
        </label>
        <input
          id="filter-client"
          className="order-filters__input"
          type="text"
          placeholder="Nume client…"
          value={filters.clientSearch}
          onChange={(e) => onChange('clientSearch', e.target.value)}
        />
      </div>

      <div className="order-filters__control">
        <label className="order-filters__label" htmlFor="filter-county">
          Județ
        </label>
        <select
          id="filter-county"
          className="order-filters__select"
          value={filters.county}
          onChange={(e) => onChange('county', e.target.value)}
        >
          <option value="">Toate județele</option>
          {countyOptions.map((county) => (
            <option key={county} value={county}>
              {county}
            </option>
          ))}
        </select>
      </div>

      <div className="order-filters__control">
        <label className="order-filters__label" htmlFor="filter-platform">
          Platformă contact
        </label>
        <select
          id="filter-platform"
          className="order-filters__select"
          value={filters.platform}
          onChange={(e) => onChange('platform', e.target.value)}
        >
          <option value="">Toate platformele</option>
          {platformOptions.map((platform) => (
            <option key={platform} value={platform}>
              {platform}
            </option>
          ))}
        </select>
      </div>

      <div className="order-filters__control">
        <label className="order-filters__label" htmlFor="filter-collected">
          Încasare
        </label>
        <select
          id="filter-collected"
          className="order-filters__select"
          value={filters.collected}
          onChange={(e) => onChange('collected', e.target.value)}
        >
          <option value="">Toate</option>
          <option value="true">Încasată</option>
          <option value="false">Neîncasată</option>
        </select>
      </div>

      <div className="order-filters__control">
        <label className="order-filters__label" htmlFor="filter-delivered">
          Livrare
        </label>
        <select
          id="filter-delivered"
          className="order-filters__select"
          value={filters.delivered}
          onChange={(e) => onChange('delivered', e.target.value)}
        >
          <option value="">Toate</option>
          <option value="true">Livrată</option>
          <option value="false">Nelivrată</option>
        </select>
      </div>

      {isActive && (
        <button type="button" className="order-filters__reset" onClick={onReset}>
          Resetează filtrele
        </button>
      )}
    </div>
  );
}
