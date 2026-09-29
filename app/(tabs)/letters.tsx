// v3: Xatlar — Hujjatlar tabining segmenti. Eski deep link / push uchun redirect.
import { Redirect, type Href } from 'expo-router';

export default function LettersRedirect() {
  return <Redirect href={'/documents?seg=letters' as Href} />;
}
