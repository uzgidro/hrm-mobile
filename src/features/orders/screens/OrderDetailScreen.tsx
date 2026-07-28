import { useLocalSearchParams } from 'expo-router';
import { OrderDetailView } from '../components/OrderDetailView';

// Thin route wrapper: reads `id` from the push-route params (including the
// deep link expo-router builds for order-related push notifications via
// `routeForNotification`, see src/services/notifications.ts) and renders the
// same body tablets embed in their split-view right pane (see T15). Not
// embedded here, so OrderDetailView renders its own safe-area root + back
// button — identical to the pre-extraction screen.
export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <OrderDetailView id={Number(id)} />;
}
