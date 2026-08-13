// OTA (EAS Update) build shown under the app version. uz-Latn is the source of
// truth; the other three locales must expose the exact same keys (parity test).
export default {
  otaBuild: 'OTA {{date}} · {{id}}',
  embeddedBuild: "Bazaviy yig'ilma",
} as const;
