'use strict';

const path = require('path');

// Ensure db.js resolves its data/ directory relative to the project root, not CWD.
const ROOT = path.join(__dirname, '..');
process.chdir(ROOT);

const { getDb } = require('../src/lib/db.js');
const { create: createTemplate } = require('../src/lib/productTemplates.js');
const { create: createMaterial } = require('../src/lib/materials.js');
const { replaceRecipe } = require('../src/lib/recipes.js');
const { createProductFromTemplate, updateProduct } = require('../src/lib/products.js');

const FRESH = process.argv.includes('--fresh');

function uid() {
  return crypto.randomUUID();
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
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
  'Andrei și Maria Popescu', 'Ioan Ionescu',     'Salon Cristal',     'Raluca Dumitrescu',
  'Familia Gheorghe',        'Elena și Paul Radu','SC Agrovet SRL',   'Cosmina Vlad',
  'Mihai Drăghici',          'Lavinia Toma',      'Ioana și Bogdan',  'Hotel Belvedere',
  'Oana Popa',               'Florin Marin',
];

const COUNTIES   = ['Iași', 'Cluj', 'București', 'Timișoara', 'Brașov', 'Constanța', 'Sibiu', 'Pitești'];
const PLATFORMS  = ['WhatsApp', 'Instagram', 'Facebook', 'Email', 'Telefon'];

// Columns: daysAgo | clientIdx | countyIdx | platformIdx | templateIdxs[] | qty | unitPrice | profit | advance | collected | delivered
const ORDERS = [
  [335,  0, 0, 0, [0, 7], 100,  4.5,  380, 150, 1, 1],
  [325,  1, 1, 3, [3],    200,  1.2,  120,  50, 1, 1],
  [305,  2, 2, 1, [0, 2], 150,  5.5,  720, 300, 1, 1],
  [295,  3, 3, 2, [6],     50,  3.0,  100,  50, 1, 1],
  [275,  4, 4, 0, [0, 7], 200,  4.5,  800, 400, 1, 1],
  [265,  5, 0, 4, [4],    500,  0.8,  200, 100, 1, 1],
  [245,  6, 5, 3, [3],    300,  1.5,  250, 100, 1, 1],
  [235,  7, 6, 1, [1],    120,  4.0,  350, 150, 1, 1],
  [215,  8, 7, 2, [0],     80,  4.5,  280, 100, 1, 1],
  [205,  9, 1, 0, [5],      1, 350,   500, 200, 1, 1],
  [195, 10, 0, 1, [0,7,2], 100, 5.0,  950, 400, 1, 1],
  [175, 11, 2, 3, [2, 3], 200,  2.5,  400, 200, 1, 1],
  [165,  0, 4, 0, [0],     60,  4.5,  200, 100, 1, 1],
  [145, 12, 3, 2, [1, 7], 150,  4.2,  560, 250, 1, 1],
  [135,  1, 6, 4, [4],   1000,  0.7,  380, 150, 1, 1],
  [125,  3, 5, 1, [6],     30,  3.5,   70,   0, 1, 1],
  [105, 13, 0, 0, [0, 7], 180,  5.0,  820, 400, 1, 1],
  [ 95,  5, 1, 3, [3],    500,  1.3,  250, 100, 1, 1],
  [ 85,  6, 2, 2, [2, 5], 120,  6.0,  480, 200, 1, 1],
  [ 75,  7, 4, 1, [0],    100,  4.5,  350, 150, 1, 1],
  [ 65,  8, 3, 0, [1, 6],  80,  4.0,  280, 100, 1, 1],
  [ 55,  9, 7, 4, [4],   2000,  0.6,  700, 300, 1, 1],
  [ 45, 10, 0, 2, [0,7,2], 120, 5.0, 1100, 500, 1, 1],
  [ 35, 11, 6, 3, [3],    400,  1.2,  200, 100, 0, 1],
  [ 20, 12, 1, 0, [0],     90,  4.8,  320, 150, 0, 0],
  [ 15,  0, 2, 1, [1, 6], 100,  4.5,  380, 200, 0, 0],
  [ 10, 13, 5, 0, [2],    200,  2.5,  300,   0, 0, 0],
  [  5,  3, 3, 2, [5],      1, 400,   580, 300, 0, 0],
];

// ── Main ──────────────────────────────────────────────────────────

function main() {
  const db = getDb();

  if (FRESH) {
    console.log('Clearing existing data...');
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

  for (const [days, ci, coi, pi, tIdxs, qty, unitPrice, profit, advance, collected, delivered] of ORDERS) {
    const client = CLIENTS[ci];
    const firstWord = client.split(/[\s,&]/)[0];
    const baseName = `${TEMPLATES[tIdxs[0]].name} – ${firstWord}`;
    const n = (nameCount.get(baseName) ?? 0) + 1;
    nameCount.set(baseName, n);
    const name = n > 1 ? `${baseName} (${n})` : baseName;

    const orderId = uid();
    const createdAt = daysAgo(days);
    const receptionDate = createdAt.slice(0, 10);
    const eventDate = new Date(Date.parse(createdAt) + 21 * 86400000).toISOString().slice(0, 10);

    db.prepare(`
      INSERT INTO orders
        (id, name, created_at, client, county, contact_platform,
         profit, advance, collected, delivered, reception_date, event_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(orderId, name, createdAt, client, COUNTIES[coi], PLATFORMS[pi],
           profit, advance, collected, delivered, receptionDate, eventDate);

    for (const tIdx of tIdxs) {
      const product = createProductFromTemplate(orderId, templates[tIdx].id, qty);
      if (product) updateProduct(product.id, { unitPrice });
    }
    inserted++;
  }

  console.log(`\nSeed complete:`);
  console.log(`  Materials : ${mats.length}`);
  console.log(`  Templates : ${templates.length}`);
  console.log(`  Recipes   : ${Object.keys(RECIPES).length} templates with recipe lines`);
  console.log(`  Orders    : ${inserted} (spanning ~12 months)`);
  console.log(`\nRestart the dev server to see updated data.`);
}

main();
