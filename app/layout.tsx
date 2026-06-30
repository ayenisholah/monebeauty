import type { Metadata } from "next";
import { cormorant, jost } from "@/lib/fonts";
import { BRAND } from "@/content/site";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: BRAND.name, template: `%s · ${BRAND.shortName}` },
  description:
    "Next-generation aesthetic medicine in Helsinki — a comprehensive approach to the beauty and health of face, body, and hair.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jost.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
