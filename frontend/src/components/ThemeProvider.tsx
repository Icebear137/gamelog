"use client";

import { Theme } from "@radix-ui/themes";

// Wraps the app with Radix UI Theme (dark, violet accent).
// hasBackground={false} keeps our custom gradient background in globals.css.
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <Theme
      appearance="dark"
      accentColor="violet"
      grayColor="slate"
      radius="medium"
      hasBackground={false}
    >
      {children}
    </Theme>
  );
}
