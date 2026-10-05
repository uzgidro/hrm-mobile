// Asosiy tab. Mehmonning bosh sahifasi — o'z arizasi holati (v2 DashboardPage →
// RegistrationStatusPage), admin hisobiniki — Filiallar (v2 DashboardPage → /filiallar);
// redirect emas, chunki tablar (Modullar, Profil — chiqish) ularga ham kerak. Feature'lar
// bir-birini import qilmagani uchun tanlov shu yerda. Filiallar moduli o'chirilgan bo'lsa
// admin uchun bu tab yashirin (visibleTabs), HomeScreen esa uni Modullarga yuboradi.
import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { useNavSettings } from '@/lib/navSettings';
import { homeBoardFor } from '@/utils/homeBoard';
import { canAccessPage } from '@/utils/roles';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import RegistrationStatusScreen from '@/features/registration/screens/RegistrationStatusScreen';
import BranchesScreen from '@/features/branches/screens/BranchesScreen';

export default function HomeTab() {
  const user = useAuthStore((s) => s.user);
  // Filiallar moduli nav.modules da o'chirilsa — qayta chizilsin.
  useNavSettings();
  const board = homeBoardFor(user);
  if (board === 'guest') return <RegistrationStatusScreen />;
  if (board === 'admin' && canAccessPage(user, 'branches')) return <BranchesScreen />;
  return <HomeScreen />;
}
