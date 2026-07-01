import { requestRevision } from '../../../../../../lib/approvalTokens.js';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
  const { uuid, productId } = await params;
  try {
    const body = await request.json();
    const feedback = typeof body.feedback === 'string' ? body.feedback.trim() : '';
    if (!feedback) {
      return Response.json({ error: 'Feedback-ul nu poate fi gol.' }, { status: 400 });
    }
    const result = requestRevision(uuid, productId, feedback);
    if (!result) {
      return Response.json({ error: 'Link de aprobare sau produs negăsit.' }, { status: 404 });
    }
    return Response.json(result);
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
