import { listAll } from '../../lib/productTemplates.js';
import CatalogPage from '../../components/CatalogPage.js';

export const metadata = {
  title: 'Catalog Produse — Avify',
};

export default function CatalogRoute() {
  const templates = listAll();
  return <CatalogPage initialTemplates={templates} />;
}
