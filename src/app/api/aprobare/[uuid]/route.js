import { getApprovalPageData } from '../../../../lib/approvalTokens.js';

export const dynamic = 'force-dynamic';

export async function GET(_req, { params }) {
  const { uuid } = await params;
  try {
    const data = getApprovalPageData(uuid);
    if (!data) {
      return Response.json(
        {
          error:
            'Acest link de aprobare nu este valid sau a expirat. Contactați studioul pentru un nou link.',
        },
        { status: 404 }
      );
    }
    return Response.json(data);
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
