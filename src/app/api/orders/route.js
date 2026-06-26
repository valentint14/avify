import { getAll, create } from '../../../lib/orders.js';
import { VALID_EVENTS, VALID_PAYMENT, VALID_STAGES } from '../../../lib/constants.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const filters = {};
    const ps = searchParams.get('payment_status');
    const from = searchParams.get('event_date_from');
    const to = searchParams.get('event_date_to');
    if (ps) filters.payment_status = ps;
    if (from) filters.event_date_from = from;
    if (to) filters.event_date_to = to;
    return Response.json({ orders: getAll(filters) });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();

    const pn = typeof body.primaryName === 'string' ? body.primaryName.trim() : '';
    if (!pn) {
      return Response.json({ error: 'Numele clientului este obligatoriu.' }, { status: 400 });
    }
    if (pn.length > 100) {
      return Response.json({ error: 'Numele clientului nu poate depăși 100 de caractere.' }, { status: 400 });
    }
    if (!body.eventDate || !/^\d{4}-\d{2}-\d{2}$/.test(body.eventDate)) {
      return Response.json(
        { error: 'Data evenimentului este obligatorie (format YYYY-MM-DD).' },
        { status: 400 }
      );
    }
    if (!VALID_EVENTS.includes(body.eventType)) {
      return Response.json(
        { error: 'Tipul evenimentului trebuie să fie "nunta" sau "botez".' },
        { status: 400 }
      );
    }
    if (!Array.isArray(body.productTypes) || body.productTypes.length === 0) {
      return Response.json({ error: 'Cel puțin un tip de produs este obligatoriu.' }, { status: 400 });
    }
    if (!VALID_PAYMENT.includes(body.paymentStatus)) {
      return Response.json({ error: 'Statusul plății este invalid.' }, { status: 400 });
    }
    if (body.stage && !VALID_STAGES.includes(body.stage)) {
      return Response.json({ error: 'Etapa fluxului este invalidă.' }, { status: 400 });
    }

    const order = create({
      primaryName: pn,
      secondaryName: typeof body.secondaryName === 'string' ? body.secondaryName.trim() || null : null,
      eventDate: body.eventDate,
      eventType: body.eventType,
      productTypes: body.productTypes,
      paymentStatus: body.paymentStatus,
      stage: body.stage || 'de_facut',
      notes: typeof body.notes === 'string' ? body.notes.trim() || null : null,
    });
    return Response.json({ order }, { status: 201 });
  } catch {
    return Response.json({ error: 'Eroare internă de server.' }, { status: 500 });
  }
}
