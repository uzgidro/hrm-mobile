// «Bu ekran — tab ildizi» belgisi. Tab bar (telefonda) yoki NavRail (planshetda)
// o'zi navigatsiya — tab ildizida orqaga strelkasi chiqmaydi (v2 sahifalarida ham
// yo'q). `router.canGoBack()` bunga yaramaydi: `backBehavior="history"` bilan tablar
// orasida yurilgach u `true`. Shuning uchun tab route fayllari ekranni
// `<TabRoot>` bilan o'raydi, sarlavhalar (`ScreenHeader`, `PageHeader`) esa
// `useIsTabRoot()` ni o'qiydi. Xuddi shu ekran stack'ga push qilinsa (masalan,
// `/attendance-detail`) — o'rovsiz, strelka joyida.
import React, { createContext, useContext, type ReactNode } from 'react';

const TabRootContext = createContext(false);

export function TabRoot({ children }: { children: ReactNode }) {
  return <TabRootContext.Provider value>{children}</TabRootContext.Provider>;
}

export function useIsTabRoot(): boolean {
  return useContext(TabRootContext);
}
