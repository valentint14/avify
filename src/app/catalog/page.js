import { Suspense } from 'react';
import { listAll } from '../../lib/productTemplates.js';
import CatalogPage from '../../components/CatalogPage.js';
import CatalogPageSkeleton from '@/components/skeletons/CatalogPageSkeleton';

export const metadata = {
  title: 'Catalog Produse — Avify',
};

export const dynamic = 'force-dynamic';

export default function CatalogRoute() {
  return (
    <Suspense fallback={<CatalogPageSkeleton />}>
      <CatalogData />
    </Suspense>
  );
}

async function CatalogData() {
  await new Promise((resolve) => setImmediate(resolve));
  const templates = listAll();
  return <CatalogPage initialTemplates={templates} />;
}
