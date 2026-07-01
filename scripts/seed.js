'use strict';

const path = require('path');

// Ensure db.js resolves its data/ directory relative to the project root, not CWD.
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const { getDb } = require('../src/lib/db.js');
const { create: createTemplate } = require('../src/lib/productTemplates.js');
const { create: createMaterial } = require('../src/lib/materials.js');
const { replaceRecipe } = require('../src/lib/recipes.js');
const { createProductFromTemplate, updateProduct, updateProductStatus } = require('../src/lib/products.js');

const FRESH = process.argv.includes('--fresh');

function uid() {
  return crypto.randomUUID();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}

function addDays(isoStr, n) {
  return new Date(Date.parse(isoStr) + n * 86400000).toISOString().slice(0, 10);
}

// ── Static seed data ──────────────────────────────────────────────

const MATERIALS = [
  { name: 'Hârtie mată 170g/m²',       currentStock: 500, minStock: 100, unit: 'coli' },
  { name: 'Hârtie glossy 300g/m²',      currentStock: 200, minStock: 50,  unit: 'coli' },
  { name: 'Carton alb 350g/m²',          currentStock: 150, minStock: 30,  unit: 'coli' },
  { name: 'Plicuri C6 albe',             currentStock: 300, minStock: 50,  unit: 'buc'  },
  { name: 'Panglică satin 1cm',          currentStock: 50,  minStock: 10,  unit: 'm'    },
  { name: 'Folie laminare mată',         currentStock: 100, minStock: 20,  unit: 'foi'  },
  { name: 'Cerneală foto (set 6 cul.)',  currentStock: 8,   minStock: 2,   unit: 'set'  },
];

const TEMPLATES = [
  { name: 'Invitație nuntă clasică',  description: 'Pe hârtie glossy cu plic și panglică satin.' },
  { name: 'Invitație nuntă modernă',  description: 'Design minimalist pe carton 350g.' },
  { name: 'Meniu restaurant',          description: 'Față-verso plastifiat, format A4 sau A5.' },
  { name: 'Pliant A5 față-verso',      description: 'Pliant promoțional pe hârtie mată.' },
  { name: 'Carte de vizită premium',   description: 'Carton 350g, finisaj mat.' },
  { name: 'Banner personalizat',       description: 'Vinil imprimat și plastifiat.' },
  { name: 'Felicitare aniversară',     description: 'Pliată pe hârtie glossy cu plic.' },
  { name: 'Program de nuntă',          description: 'A5 față-verso pe hârtie mată.' },
];

// RECIPES[templateIndex] = [{ m: materialIndex, qty: qtyPerPiece }]
const RECIPES = {
  0: [{ m: 1, qty: 2 }, { m: 3, qty: 1 }, { m: 4, qty: 0.05 }],
  1: [{ m: 2, qty: 2 }, { m: 3, qty: 1 }],
  2: [{ m: 1, qty: 2 }, { m: 5, qty: 1 }],
  3: [{ m: 0, qty: 1 }],
  4: [{ m: 2, qty: 1 }],
  5: [{ m: 5, qty: 2 }],
  6: [{ m: 1, qty: 1 }, { m: 3, qty: 1 }],
  7: [{ m: 0, qty: 4 }],
};

const CLIENTS = [
  'Andrei și Maria Popescu', 'Ioan Ionescu',       'Salon Cristal',      'Raluca Dumitrescu',
  'Familia Gheorghe',        'Elena și Paul Radu', 'SC Agrovet SRL',     'Cosmina Vlad',
  'Mihai Drăghici',          'Lavinia Toma',       'Ioana și Bogdan',    'Hotel Belvedere',
  'Oana Popa',               'Florin Marin',       'Teodora și Vlad',
];

// County names must exactly match the SVG map path names (Romanian diacritics)
const COUNTIES = [
  'Iași',        // 0 — concentrated sales hub
  'Cluj',        // 1 — concentrated sales hub
  'București',   // 2 — concentrated sales hub
  'Timiș',       // 3
  'Brașov',      // 4
  'Constanța',   // 5
  'Sibiu',       // 6
  'Argeș',       // 7
  'Prahova',     // 8
  'Bacău',       // 9
  'Dolj',        // 10
  'Mureș',       // 11
  'Suceava',     // 12
  'Galați',      // 13
];

const PLATFORMS = ['WhatsApp', 'Instagram', 'Facebook', 'Email', 'Telefon'];

// Column legend:
// daysAgo | clientIdx | countyIdx | platformIdx | templateIdxs[] | qty | unitPrice | profit
// advance | collected | delivered | productStatus ('realizat'|'in_realizare'|'de_realizat') | stockDeducted
const ORDERS = [
  // ── Comenzi istorice finalizate (> 90 zile) ─────────────────────────────────
  [365,  0,  0, 0, [0, 7], 100, 4.5,  380, 150, 1, 1, 'realizat', 1],
  [340,  1,  1, 3, [3],    200, 1.2,  120,  50, 1, 1, 'realizat', 1],
  [315,  2,  2, 1, [0, 2], 150, 5.5,  720, 300, 1, 1, 'realizat', 1],
  [305,  3,  3, 2, [6],     50, 3.0,  100,  50, 1, 1, 'realizat', 1],
  [290,  4,  4, 0, [0, 7], 200, 4.5,  800, 400, 1, 1, 'realizat', 1],
  [275,  5,  0, 4, [4],    500, 0.8,  200, 100, 1, 1, 'realizat', 1],
  [260,  6,  5, 3, [3],    300, 1.5,  250, 100, 1, 1, 'realizat', 1],
  [245,  7,  6, 1, [1],    120, 4.0,  350, 150, 1, 1, 'realizat', 1],
  [230,  8,  7, 2, [0],     80, 4.5,  280, 100, 1, 1, 'realizat', 1],
  [215,  9,  1, 0, [5],      1, 350,  500, 200, 1, 1, 'realizat', 1],
  [200, 10,  0, 1, [0,7,2],100, 5.0,  950, 400, 1, 1, 'realizat', 1],
  [185, 11,  2, 3, [2, 3], 200, 2.5,  400, 200, 1, 1, 'realizat', 1],
  [175,  0,  4, 0, [0],     60, 4.5,  200, 100, 1, 1, 'realizat', 1],

  // ── Comenzi recente finalizate (30 – 90 zile) ────────────────────────────────
  [160, 12,  8, 2, [1, 7], 150, 4.2,  560, 250, 1, 1, 'realizat', 1],
  [150,  1,  6, 4, [4],   1000, 0.7,  380, 150, 1, 1, 'realizat', 1],
  [140,  3,  5, 1, [6],     30, 3.5,   70,   0, 1, 1, 'realizat', 1],
  [130, 13,  0, 0, [0, 7], 180, 5.0,  820, 400, 1, 1, 'realizat', 1],
  [115,  5,  1, 3, [3],    500, 1.3,  250, 100, 1, 1, 'realizat', 1],
  [100,  6,  9, 2, [2, 5], 120, 6.0,  480, 200, 1, 1, 'realizat', 1],
  [ 90,  7,  4, 1, [0],    100, 4.5,  350, 150, 1, 1, 'realizat', 1],
  [ 75,  8, 10, 0, [1, 6],  80, 4.0,  280, 100, 1, 1, 'realizat', 1],

  // ── Finalizate ca producție, în așteptarea livrării ──────────────────────────
  [ 60,  9,  7, 4, [4],   2000, 0.6,  700, 300, 1, 0, 'realizat', 0],
  [ 50, 10,  0, 2, [0,7,2],120, 5.0, 1100, 500, 1, 0, 'realizat', 0],

  // ── Comenzi în producție ─────────────────────────────────────────────────────
  [ 40, 11, 11, 3, [3],    400, 1.2,  200, 100, 1, 0, 'in_realizare', 0],
  [ 35, 12,  1, 0, [0],     90, 4.8,  320, 150, 1, 0, 'in_realizare', 0],
  [ 28,  0,  3, 2, [5],      1, 450,  580, 300, 0, 0, 'in_realizare', 0],

  // ── Noi — apar în lista de cumpărături și coada de producție ─────────────────
  // event_date = created_at + 21 zile → între 3 și 20 zile de azi (în fereastra de 30 zile)
  [ 18, 13,  4, 0, [0, 7], 200, 5.5,  900, 400, 1, 0, 'de_realizat', 0],
  [ 14,  2,  2, 1, [0],    150, 4.5,  600, 300, 0, 0, 'de_realizat', 0],
  [ 10, 14, 12, 0, [6, 7], 120, 3.5,  350, 150, 0, 0, 'de_realizat', 0],
  [  7,  1,  1, 3, [3],    500, 1.2,  300, 100, 0, 0, 'de_realizat', 0],
  [  4,  5,  5, 2, [0],     80, 4.8,  300, 150, 0, 0, 'de_realizat', 0],
  [  2,  4, 13, 0, [4],   1000, 0.7,  350,   0, 0, 0, 'de_realizat', 0],
  [  1,  3,  0, 1, [2, 3], 200, 2.5,  400,   0, 0, 0, 'de_realizat', 0],
];

// ── Main ──────────────────────────────────────────────────────────

function main() {
  const db = getDb();

  if (FRESH) {
    console.log('Clearing existing data...');
    db.exec('DELETE FROM product_revisions');
    db.exec('DELETE FROM product_approvals');
    db.exec('DELETE FROM approval_tokens');
    db.exec('DELETE FROM recipe_lines');
    db.exec('DELETE FROM products');
    db.exec('DELETE FROM orders');
    db.exec('DELETE FROM product_templates');
    db.exec('DELETE FROM materials');
  }

  console.log('Seeding materials...');
  const mats = MATERIALS.map((def) => createMaterial(def));

  console.log('Seeding product templates...');
  const templates = TEMPLATES.map((def) => createTemplate(def.name, def.description));

  console.log('Setting up recipes...');
  for (const [tIdx, lines] of Object.entries(RECIPES)) {
    replaceRecipe(
      templates[Number(tIdx)].id,
      lines.map(({ m, qty }) => ({ materialId: mats[m].id, qtyPerPiece: qty }))
    );
  }

  console.log('Seeding orders...');
  const nameCount = new Map();
  let inserted = 0;

  for (const [days, ci, coi, pi, tIdxs, qty, unitPrice, profit, advance, collected, delivered, productStatus, stockDeducted] of ORDERS) {
    const client = CLIENTS[ci];
    const firstWord = client.split(/[\s,&]/)[0];
    const baseName = `${TEMPLATES[tIdxs[0]].name} – ${firstWord}`;
    const n = (nameCount.get(baseName) ?? 0) + 1;
    nameCount.set(baseName, n);
    const name = n > 1 ? `${baseName} (${n})` : baseName;

    const orderId = uid();
    const createdAt = daysAgo(days);
    const receptionDate = createdAt.slice(0, 10);
    const eventDate    = addDays(createdAt, 21);
    const deliveryDate = addDays(createdAt, 14); // 7 days before event

    db.prepare(`
      INSERT INTO orders
        (id, name, created_at, client, county, contact_platform,
         profit, advance, collected, delivered, stock_deducted,
         reception_date, event_date, delivery_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      orderId, name, createdAt, client, COUNTIES[coi], PLATFORMS[pi],
      profit, advance, collected, delivered, stockDeducted,
      receptionDate, eventDate, deliveryDate
    );

    for (const tIdx of tIdxs) {
      const product = createProductFromTemplate(orderId, templates[tIdx].id, qty);
      if (product) {
        updateProduct(product.id, { unitPrice });
        if (productStatus !== 'de_realizat') {
          updateProductStatus(product.id, productStatus);
        }
      }
    }
    inserted++;
  }

  const completed  = ORDERS.filter(([,,,,,,,,,,,s]) => s === 'realizat').length;
  const inProgress = ORDERS.filter(([,,,,,,,,,,,s]) => s === 'in_realizare').length;
  const pending    = ORDERS.filter(([,,,,,,,,,,,s]) => s === 'de_realizat').length;
  const delivered  = ORDERS.filter(([,,,,,,,,,,d]) => d === 1).length;

  console.log(`\nSeed complete:`);
  console.log(`  Materials   : ${mats.length}`);
  console.log(`  Templates   : ${templates.length}`);
  console.log(`  Recipes     : ${Object.keys(RECIPES).length} templates with recipe lines`);
  console.log(`  Orders      : ${inserted} total (${delivered} livrate, ${inserted - delivered} în curs)`);
  console.log(`  Products    : realizat=${completed}, in_realizare=${inProgress}, de_realizat=${pending} comenzi`);
  console.log(`  Counties    : ${COUNTIES.length} județe în date`);
  console.log(`\nRestart the dev server to see updated data.`);
}

main();
