import { router, type Href } from 'expo-router';

/**
 * Go back if there is a screen to go back to, otherwise open `fallback`.
 *
 * WHY (QA 2026-10-05): after deleting a record on a deep-linked detail screen
 * (push notification, a pasted `/letter-detail?id=…` URL on web, a reload)
 * there is no history — `router.back()` raised «The action 'GO_BACK' was not
 * handled» and the user stayed on the deleted record. Pass the module's list
 * route as the fallback.
 */
export function goBackOr(fallback: Href): void {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
