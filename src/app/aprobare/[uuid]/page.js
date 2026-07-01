import { getApprovalPageData } from '../../../lib/approvalTokens.js';
import ApprovalClientView from '../../../components/ApprovalClientView.js';

export const metadata = {
  title: 'Aprobare design — Avify',
};

export default async function AprobarePage({ params }) {
  const { uuid } = await params;
  const data = getApprovalPageData(uuid);

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div
          role="alert"
          data-testid="approval-not-found"
          className="max-w-md w-full rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm"
        >
          <p className="text-base font-medium text-gray-800">
            Acest link de aprobare nu este valid sau a expirat.
          </p>
          <p className="mt-2 text-sm text-gray-500">
            Contactați studioul pentru un nou link.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ApprovalClientView
      order={data.order}
      products={data.products}
      tokenId={uuid}
    />
  );
}
