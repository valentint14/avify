'use strict';

const STAGES = [
  { id: 'de_facut', label: 'De făcut' },
  { id: 'in_design', label: 'În Design' },
  { id: 'validare_client', label: 'Validare Client' },
  { id: 'printare', label: 'Printare' },
  { id: 'asamblare', label: 'Asamblare' },
  { id: 'gata', label: 'Gata' },
];

const VALID_STAGES = STAGES.map((s) => s.id);

module.exports = { STAGES, VALID_STAGES };
