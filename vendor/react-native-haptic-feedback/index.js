// EMPTY ON PURPOSE. `react-native-sortables` (JS only) lists the real package as an
// OPTIONAL dependency, so npm would install it and autolinking would compile a native
// module into the next binary — a native change nobody asked for, missing from the
// binaries an OTA reaches. The library requires it only after it has found the native
// module `RNHapticFeedback`, which is never linked here; the drag list runs without haptics.
//
// To get haptics: delete this folder with its `dependencies` / `overrides` lines, bump
// expo.version and ship a store release.
module.exports = { HapticFeedbackTypes: {} };
