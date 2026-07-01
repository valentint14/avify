'use strict';

const STAGES = [
  { id: 'de_realizat', label: 'De realizat' },
  { id: 'in_realizare', label: 'În realizare' },
  { id: 'realizat', label: 'Realizat' },
];

const VALID_STAGES = STAGES.map((s) => s.id);

const ATTACHMENT_EXTENSIONS = ['pdf', 'png', 'jpg', 'jpeg', 'webp'];
const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024; // 20 MB

module.exports = { STAGES, VALID_STAGES, ATTACHMENT_EXTENSIONS, ATTACHMENT_MAX_BYTES };
