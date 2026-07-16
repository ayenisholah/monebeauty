import type { Metadata } from "next";
import { cormorant, jost } from "@/lib/fonts";
import "../../globals.css";

export const metadata: Metadata = {
  title: "Hallinta · Mone Beauty Clinic",
  robots: { index: false, follow: false },
};

export default function FinnishAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fi" className={`${cormorant.variable} ${jost.variable} h-full`}>
      <body className="min-h-full bg-page text-ink">{children}</body>
    </html>
  );
}

