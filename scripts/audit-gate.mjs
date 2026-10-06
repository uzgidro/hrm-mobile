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
// 2026-08-11: nanoid was FIXED, not allowlisted — `overrides: nanoid ^3.3.17`
// bumped it to 3.3.18 on both paths (expo-router runtime + postcss/metro-config),
// closing GHSA-2v37-7h3g-55p8. The three below are all build/dev-time ONLY (never
// in the shipped APK/IPA bundle) and have no fix reachable without a breaking
// major bump of the toolchain — DoS on a parser/loader that only runs on the
// developer's/CI machine, not on a user's device.
const ALLOW = {
  // image-size 1.2.1 via expo -> @expo/metro -> metro (the BUNDLER). The fix is
  // image-size 2.x, but metro pins `image-size@^1.0.2`, so forcing 2.x breaks the
  // bundler. Build-time only: metro parses image dimensions while bundling; it is
  // never part of the app bundle. DoS needs a malicious ICNS/JXL/HEIF asset fed to
  // our own build. Revisit when metro widens its range to image-size 2.x.
  'GHSA-w3rx-r6r6-pgpr': 'image-size (metro bundler, build-time only) — ICNS infinite loop; fix is 2.x, metro pins ^1',
  'GHSA-5p2g-fcmc-qvqq': 'image-size (metro bundler, build-time only) — JXL/HEIF infinite loop; fix is 2.x, metro pins ^1',
  // 2026-10-06: js-yaml FIXED, not allowlisted any more — 3.15.2 / 4.3.2 finally
  // backported both CPU fixes (GHSA-5p4m-2wfm-xmqj, GHSA-2883-xcg3-v3hh), pinned
  // via `overrides: js-yaml@3 / js-yaml@4`. Same day: brace-expansion, compression,
  // source-map-js fixed by overrides and axios (runtime) bumped to ^1.20.0.
  //
  // braces 3.0.3 via micromatch -> metro / jest-haste-map / @expo/cli. 3.0.3 is
  // the newest release and is itself in the vulnerable range (<=3.0.3) — no fix
  // exists. Glob matching on the developer's/CI machine only (bundler, test
  // runner); never in the shipped bundle. Revisit when braces publishes a fix.
  'GHSA-vfj7-8cjw-p6xm': 'braces (micromatch in metro/jest/@expo-cli, build-time only) — nested-pattern stack exhaustion; no fixed release (latest 3.0.3 is affected)',
  // node-forge 1.4.0 via @expo/code-signing-certificates (expo-updates `cli/` —
  // `generate-code-signing`/`configure-code-signing` commands) and @expo/cli
  // (dev-server HTTPS certs). Newest release, still affected (<=1.4.0). Node CLI
  // only — the app bundle never imports it (we don't use EAS code signing either).
  'GHSA-86w9-cpqp-85rv': 'node-forge (expo-updates CLI / @expo/cli, build-time only) — PKCS#1 v1.5 DigestAlgorithm leniency; no fixed release (latest 1.4.0 is affected)',
};

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
