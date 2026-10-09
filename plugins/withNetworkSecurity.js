// Android Network Security Config: cleartext taqiqi + *.uzgidro.uz uchun
// sertifikat pinning (xavfsizlik auditi 2026-10-09, MASVS-NETWORK-2).
//
// NIMA PINLANADI: sayt sertifikati EMAS (Let's Encrypt uni ~90 kunda, kalit
// bilan birga almashtiradi), balki ISRG ILDIZ kalitlari — zanjir:
//   *.uzgidro.uz → YR1/YR2 → ISRG Root YR → (cross-sign) ISRG Root X1.
// Zaxira sifatida X2 (ECDSA) va Root YE (yangi avlod ECDSA) ham bor, shunda LE
// ECDSA yoki yangi ildizga o'tsa ham ilova ishlayveradi.
//
// ⚠️ XAVFSIZLIK TO'RI: `expiration` sanasidan keyin Android pinlarni
// e'tiborsiz qoldiradi (oddiy tizim tekshiruvi qoladi) — CA butunlay
// almashtirilsa ham ilova abadiy «o'lmaydi». Har yili reliz bilan sanani
// suring. Serverda boshqa CA'ga (masalan, Sectigo) o'tishdan OLDIN shu yerga
// uning ildiz pinini qo'shib reliz chiqaring, aks holda eski build'lar
// expiration'gacha serverga ulana olmaydi.
//
// Pin = base64(SHA-256(SubjectPublicKeyInfo)):
//   openssl x509 -in root.pem -pubkey -noout | openssl pkey -pubin -outform der \
//     | openssl dgst -sha256 -binary | base64
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');

const PINS = [
  'C5+lpZ7tcVwmwQIMcRtPbsQtWLABXhQzejna0wHFr8M=', // ISRG Root X1 (RSA)
  'diGVwiVYbubAI3RW4hB9xU8e/CH2GnkuvVFZE8zmgzI=', // ISRG Root X2 (ECDSA)
  'fk6IOKit1ild5647BH06ujSIq5XbCgqlbYl6ANhhi88=', // ISRG Root YR (RSA, 2025 avlod)
  'sCkq5UWXjg+7mKu9lMhhYF5bGLsy7VI/UNW3tccdR7w=', // ISRG Root YE (ECDSA, 2025 avlod)
];
const PIN_EXPIRATION = '2027-10-01';

const XML = `<?xml version="1.0" encoding="utf-8"?>
<!-- plugins/withNetworkSecurity.js yaratadi — qo'lda tahrirlamang. -->
<network-security-config>
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <certificates src="system" />
    </trust-anchors>
  </base-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">uzgidro.uz</domain>
    <pin-set expiration="${PIN_EXPIRATION}">
${PINS.map((p) => `      <pin digest="SHA-256">${p}</pin>`).join('\n')}
    </pin-set>
  </domain-config>
  <!-- Faqat dev: Metro bundler (emulyator / USB). Relizda bu manzillarga hech narsa ketmaydi. -->
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">localhost</domain>
    <domain includeSubdomains="false">10.0.2.2</domain>
    <domain includeSubdomains="false">10.0.3.2</domain>
  </domain-config>
</network-security-config>
`;

function withNetworkSecurity(config) {
  config = withDangerousMod(config, [
    'android',
    async (cfg) => {
      const dir = path.join(cfg.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res', 'xml');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'network_security_config.xml'), XML);
      return cfg;
    },
  ]);
  return withAndroidManifest(config, (cfg) => {
    const app = cfg.modResults.manifest.application?.[0];
    if (app) app.$['android:networkSecurityConfig'] = '@xml/network_security_config';
    return cfg;
  });
}

module.exports = withNetworkSecurity;
module.exports.PINS = PINS;
module.exports.PIN_EXPIRATION = PIN_EXPIRATION;
