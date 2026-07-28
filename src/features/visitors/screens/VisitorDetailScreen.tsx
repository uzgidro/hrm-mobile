import { useLocalSearchParams } from 'expo-router';
import { VisitorDetailView } from '../components/VisitorDetailView';

// Thin route wrapper: reads `id` from the push-route params and renders the
// same body tablets embed in their split-view right pane (see T20). Not
// embedded here, so VisitorDetailView renders its own safe-area root + back
// button — identical to the pre-extraction screen. Default export name kept
// as `MehmonDetailScreen` (matches the route file's original identifier).
export default function MehmonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VisitorDetailView id={Number(id)} />;
}
