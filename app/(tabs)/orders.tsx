// v3: Buyruqlar — Hujjatlar tabining segmenti. Eski deep link / push uchun redirect.
import { Redirect, type Href } from 'expo-router';

export default function OrdersRedirect() {
  return <Redirect href={'/documents?seg=orders' as Href} />;
}
