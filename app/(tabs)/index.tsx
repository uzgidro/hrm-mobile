// Asosiy tab. Mehmonning bosh sahifasi — o'z arizasi holati (v2 DashboardPage →
// RegistrationStatusPage); redirect emas, chunki tablar (Modullar, Profil — chiqish)
// mehmonga ham kerak. Feature'lar bir-birini import qilmagani uchun tanlov shu yerda.
import React from 'react';
import { useAuthStore } from '@/store/authStore';
import { homeBoardFor } from '@/utils/homeBoard';
import HomeScreen from '@/features/dashboard/screens/HomeScreen';
import RegistrationStatusScreen from '@/features/registration/screens/RegistrationStatusScreen';

export default function HomeTab() {
  const user = useAuthStore((s) => s.user);
  return homeBoardFor(user) === 'guest' ? <RegistrationStatusScreen /> : <HomeScreen />;
}
