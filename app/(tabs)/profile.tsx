// Profil tabi — tab ildizi: orqaga strelkasi yo'q (TabRoot), navigatsiya tab bar / NavRail'da.
import ProfileScreen from '@/features/profile/screens/ProfileScreen';
import { TabRoot } from '@/components/TabRoot';

export default function ProfileTab() {
  return (
    <TabRoot>
      <ProfileScreen />
    </TabRoot>
  );
}
