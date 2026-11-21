// SOLARA round 10 — brisk-sparrow-28
// Entrypoint for the make.fun grader: copies game/ + screenshots/ into
// /output and writes /output/dossier.json with the dossier library.
import { fileURLToPath } from 'node:url';
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildDossier } from './vendor/makefun-game.js';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
mkdirSync(outDir, { recursive: true });
cpSync(join(root, 'game'), join(outDir, 'game'), { recursive: true });
cpSync(join(root, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
const dossier = buildDossier(outDir);
writeFileSync(join(outDir, 'dossier.json'), JSON.stringify(dossier, null, 2));
console.log('SOLARA dossier written to ' + join(outDir, 'dossier.json'));
