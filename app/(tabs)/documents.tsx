// v3 Hujjatlar tabi: segmentli qobiq (shell) + uch feature ro'yxati. Route fayli
// kompozitsiya qiladi — feature'lar bir-birini import qilmaydi.
import DocumentsTabScreen from '@/features/shell/screens/DocumentsTabScreen';
import OrdersListScreen from '@/features/orders/screens/OrdersListScreen';
import LettersListScreen from '@/features/letters/screens/LettersListScreen';
import DocumentsListScreen from '@/features/documents/screens/DocumentsListScreen';

export default function DocumentsTab() {
  return (
    <DocumentsTabScreen
      renderSegment={(seg) =>
        seg === 'orders' ? (
          <OrdersListScreen embedded />
        ) : seg === 'letters' ? (
          <LettersListScreen embedded />
        ) : (
          <DocumentsListScreen embedded />
        )
      }
    />
  );
}
