#!/usr/bin/env node
// CI dependency-audit gate.
//
// Fails on any HIGH or CRITICAL advisory EXCEPT ones on the allowlist below.
// The allowlist holds advisories that (a) are build/dev-time only — the package
// never ships in the release bundle (APK/IPA) — AND (b) have no fix reachable
// without a breaking downgrade of the toolchain. Each entry names the package,
// the reason it can't be fixed yet, and where it lives, so the list can't rot.
//
// When a real fix ships (or a NEW advisory appears that isn't listed), this gate
// goes red again — unlike `npm audit ... || true`, which silences everything.
//
// To re-check the allowlist: run `npm audit`, and for any listed GHSA confirm a
// non-breaking fixed version now exists; if so, bump the dep / add an override
// and delete the entry here. `npm run audit:gate` reports stale entries (listed
// advisories that no longer appear) so they get pruned.
//
// Runtime deps (anything reachable from src/ in the shipped bundle — axios &c.)
// must NEVER be allowlisted; fix them at the source.

import { execSync } from 'node:child_process';

/** GHSA id -> why it's tolerated. Keep the reason honest and specific. */
// Empty: the former brace-expansion / js-yaml / shell-quote entries were all
// resolved 2026-08-04 — `npm audit fix` bumped brace-expansion 1.1.15->1.1.18
// (closes the v1 chain) and an `overrides: minimatch@10 -> brace-expansion 5.0.9`
// pins the v5 chain (expo-updates -> glob@13 -> minimatch@10), which also cleared
// the js-yaml/shell-quote transitive advisories. Add entries back only for a
// genuinely-unfixable, build-time-only advisory, with an honest reason.
const ALLOW = {};

const BLOCKING = new Set(['high', 'critical']);

function auditJson() {
  // `npm audit` exits non-zero when advisories exist — capture output anyway.
  try {
    return JSON.parse(execSync('npm audit --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch (e) {
    if (e.stdout) return JSON.parse(e.stdout);
    throw e;
  }
}

const report = auditJson();
const vulns = report.vulnerabilities || {};

/** Collect distinct blocking advisories, split by allowlisted vs not. */
const blocked = new Map();   // ghsa -> { pkg, severity, title }
const tolerated = new Set(); // ghsa actually seen this run

for (const [pkg, node] of Object.entries(vulns)) {
  for (const via of node.via || []) {
    if (typeof via !== 'object' || !via.url) continue;
    const ghsa = via.url.split('/').pop();
    if (!BLOCKING.has(via.severity)) continue;
    if (ALLOW[ghsa]) { tolerated.add(ghsa); continue; }
    if (!blocked.has(ghsa)) blocked.set(ghsa, { pkg: via.name || pkg, severity: via.severity, title: via.title || '' });
  }
}

// Report tolerated advisories (transparency) + warn on stale allowlist entries.
if (tolerated.size) {
  console.log(`ℹ️  Tolerated (allowlisted) advisories: ${tolerated.size}`);
  for (const ghsa of tolerated) console.log(`   - ${ghsa}: ${ALLOW[ghsa]}`);
}
const stale = Object.keys(ALLOW).filter((g) => !tolerated.has(g));
if (stale.length) {
  console.log(`\n⚠️  Stale allowlist entries (no longer reported — remove them from scripts/audit-gate.mjs):`);
  for (const g of stale) console.log(`   - ${g}`);
}

if (blocked.size) {
  console.error(`\n❌ Audit gate: ${blocked.size} non-allowlisted high/critical advisory(ies):`);
  for (const [ghsa, info] of blocked) {
    console.error(`   - ${info.severity.toUpperCase()} ${ghsa} (${info.pkg}): ${info.title}`);
    console.error(`     https://github.com/advisories/${ghsa}`);
  }
  console.error(`\nIf a fix exists, apply it. If it's genuinely unfixable and build-time only, add it to ALLOW in scripts/audit-gate.mjs with a reason.`);
  process.exit(1);
}

console.log(`\n✅ Audit gate passed: no blocking advisories outside the allowlist.`);
