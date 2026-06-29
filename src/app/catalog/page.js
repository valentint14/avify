import { listAll } from '../../lib/productTemplates.js';
import CatalogPage from '../../components/CatalogPage.js';

export const metadata = {
  title: 'Catalog Produse — Avify',
};

// Always render fresh on the server so the catalog reflects current data on
// navigation — no stale seed, consistent with the other pages.
export const dynamic = 'force-dynamic';

export default function CatalogRoute() {
  const templates = listAll();
  return <CatalogPage initialTemplates={templates} />;
}
