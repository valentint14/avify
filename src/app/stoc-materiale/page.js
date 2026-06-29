import { listAll } from '../../lib/materials.js';
import MaterialsPage from '../../components/MaterialsPage.js';

export const metadata = {
  title: 'Stoc Materiale — Avify',
};

// Always render fresh on the server so stock reflects deductions made on
// other pages (e.g. completing an order) — no stale seed, no flash.
export const dynamic = 'force-dynamic';

export default function StocMaterialeRoute() {
  const materials = listAll();
  return <MaterialsPage initialMaterials={materials} />;
}
