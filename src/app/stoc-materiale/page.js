import { Suspense } from 'react';
import { listAll } from '../../lib/materials.js';
import MaterialsPage from '../../components/MaterialsPage.js';
import MaterialsPageSkeleton from '@/components/skeletons/MaterialsPageSkeleton';

export const metadata = {
  title: 'Stoc Materiale — Avify',
};

export const dynamic = 'force-dynamic';

export default function StocMaterialeRoute() {
  return (
    <Suspense fallback={<MaterialsPageSkeleton />}>
      <StocMaterialeData />
    </Suspense>
  );
}

async function StocMaterialeData() {
  await new Promise((resolve) => setImmediate(resolve));
  const materials = listAll();
  return <MaterialsPage initialMaterials={materials} />;
}
