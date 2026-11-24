// How cards under this point are drawn: the home screen's own design. Outside a provider
// cards look as the design system draws them.
import React, { createContext, useContext, type ReactNode } from 'react';

export const CARD_STYLES = ['soft', 'flat', 'outline', 'tint'] as const;
export type CardStyle = (typeof CARD_STYLES)[number];

export interface CardLook {
  style?: CardStyle;
  radius?: number;
  /** Ground of a card, when it is not the theme's surface. */
  ground?: string;
}

const Context = createContext<CardLook>({});

export const useCardLook = (): CardLook => useContext(Context);

/** Values left out keep those of the provider above. */
export function CardLookProvider({ look, children }: { look: CardLook; children: ReactNode }) {
  const above = useContext(Context);
  const value = React.useMemo(() => {
    const own = Object.fromEntries(Object.entries(look).filter(([, v]) => v !== undefined)) as CardLook;
    return { ...above, ...own };
  }, [above, look]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
