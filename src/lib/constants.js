'use strict';

const STAGES = [
  { id: 'de_facut', label: 'De făcut' },
  { id: 'in_design', label: 'În design' },
  { id: 'validare_client', label: 'Validare client' },
  { id: 'printare', label: 'Printare' },
  { id: 'asamblare', label: 'Asamblare' },
  { id: 'livrat', label: 'Livrat' },
];

const VALID_STAGES = STAGES.map((s) => s.id);

const VALID_PAYMENT = ['neachitat', 'avans_achitat', 'achitat_integral'];

const PAYMENT_LABELS = {
  neachitat: 'Neachitat',
  avans_achitat: 'Avans achitat',
  achitat_integral: 'Achitat integral',
};

const VALID_EVENTS = ['nunta', 'botez'];

const EVENT_LABELS = {
  nunta: 'Nuntă',
  botez: 'Botez',
};

module.exports = { STAGES, VALID_STAGES, VALID_PAYMENT, PAYMENT_LABELS, VALID_EVENTS, EVENT_LABELS };
