// WRITE_EXTERNAL_STORAGE — faqat Android 9 (API 28) va undan eskisi uchun.
//
// NEGA BLOKLANMAYDI (kod ko'rigi 2026-10-09): expo-image-picker `launchCameraAsync`
// Android < 10 da WRITE_EXTERNAL_STORAGE ni so'raydi va berilmasa kamerani
// OCHMAYDI (ImagePickerModule.ensureCameraPermissionsAreGranted) — ruxsat
// manifestdan olib tashlansa «Keldim» surati va mehmon rasmi Android 7–9 da
// ishlamay qolardi. Android 10+ da bu ruxsat hech narsa bermaydi, shuning uchun
// `maxSdkVersion="28"`: zamonaviy telefonlarda u umuman ko'rinmaydi.
// READ_EXTERNAL_STORAGE / READ_MEDIA_IMAGES esa app.json blockedPermissions'da.
const { withAndroidManifest } = require('expo/config-plugins');

const NAME = 'android.permission.WRITE_EXTERNAL_STORAGE';

module.exports = function withLegacyStoragePermission(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = manifest.$['xmlns:tools'] || 'http://schemas.android.com/tools';
    const perms = (manifest['uses-permission'] = manifest['uses-permission'] || []);
    let entry = perms.find((p) => p.$['android:name'] === NAME);
    if (!entry) {
      entry = { $: { 'android:name': NAME } };
      perms.push(entry);
    }
    delete entry.$['tools:node'];
    entry.$['android:maxSdkVersion'] = '28';
    entry.$['tools:replace'] = 'android:maxSdkVersion';
    return cfg;
  });
};
