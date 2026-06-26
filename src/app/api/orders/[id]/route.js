import { getById, update, deleteOrder } from '../../../../lib/orders.js';
import { VALID_EVENTS, VALID_PAYMENT, VALID_STAGES } from '../../../../lib/constants.js';

export async function GET(_req, { params }) {
  try {
    const order = getById(params.id);
    if (!order) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    return Response.json({ order });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const body = await request.json();
    const has = (k) => Object.prototype.hasOwnProperty.call(body, k);

    if (has('eventType') && !VALID_EVENTS.includes(body.eventType)) {
      return Response.json({ error: 'Tipul evenimentului este invalid.' }, { status: 400 });
    }
    if (has('paymentStatus') && !VALID_PAYMENT.includes(body.paymentStatus)) {
      return Response.json({ error: 'Statusul plății este invalid.' }, { status: 400 });
    }
    if (has('stage') && !VALID_STAGES.includes(body.stage)) {
      return Response.json({ error: 'Etapa fluxului este invalidă.' }, { status: 400 });
    }

    const order = update(params.id, body);
    if (!order) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    return Response.json({ order });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function DELETE(_req, { params }) {
  try {
    const deleted = deleteOrder(params.id);
    if (!deleted) return Response.json({ error: 'Comanda nu a fost găsită.' }, { status: 404 });
    return Response.json({ success: true });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
