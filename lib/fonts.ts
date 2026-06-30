import { Cormorant_Garamond, Jost } from "next/font/google";

// Display / serif — wordmark, all headlines, technology names.
export const cormorant = Cormorant_Garamond({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

// Body / UI sans — nav, eyebrows, body copy, buttons, labels, footer.
// NOTE: Jost has no Cyrillic subset; Russian copy falls back to system sans
// until a Cyrillic-capable companion face is chosen (tracked for RU polish).
export const jost = Jost({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-sans",
  display: "swap",
});

export const fontVariables = `${cormorant.variable} ${jost.variable}`;
