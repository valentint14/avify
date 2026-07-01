import { Suspense } from 'react';
import DashboardSkeleton from '@/components/skeletons/DashboardSkeleton';
import MonthlyProfitChart from '@/components/dashboard/MonthlyProfitChart';
import TopProductsChart from '@/components/dashboard/TopProductsChart';
import KpiCard from '@/components/dashboard/KpiCard';
import RomaniaSalesMap from '@/components/dashboard/RomaniaSalesMap';
import { getMonthlyProfitData, getTopProducts, getDashboardKPIs, getSalesMapData } from '@/lib/analytics';

export const metadata = {
  title: 'Statistici — Avify',
};

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardData />
    </Suspense>
  );
}

async function DashboardData() {
  await new Promise((resolve) => setImmediate(resolve));

  const kpis = getDashboardKPIs();
  const monthly = getMonthlyProfitData(12);
  const products = getTopProducts(10);
  const salesMap = getSalesMapData();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="text-2xl font-bold tracking-tight">Statistici</h1>

      <section aria-label="KPI-uri" className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard label="Total comenzi" value={kpis.totalOrders} />
        <KpiCard
          label="Venituri totale"
          value={kpis.totalRevenue.toFixed(2)}
          unit="RON"
        />
        <KpiCard
          label="Profit total"
          value={kpis.totalProfit.toFixed(2)}
          unit="RON"
        />
      </section>

      <section aria-label="Profit lunar">
        <h2 className="mb-4 text-lg font-semibold">Evoluție profit lunar</h2>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <MonthlyProfitChart data={monthly} />
        </div>
      </section>

      <section aria-label="Top produse">
        <h2 className="mb-4 text-lg font-semibold">Cele mai vândute produse</h2>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <TopProductsChart data={products} />
        </div>
      </section>

      <section aria-label="Harta vânzărilor">
        <h2 className="mb-4 text-lg font-semibold">Harta vânzărilor</h2>
        <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
          <RomaniaSalesMap countyData={salesMap} />
        </div>
      </section>
    </div>
  );
}
