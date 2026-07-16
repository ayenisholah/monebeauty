import type { Metadata } from "next";
import { cormorant, jost } from "@/lib/fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: "Admin · Mone Beauty Clinic",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${cormorant.variable} ${jost.variable} h-full`}
      data-scroll-behavior="smooth"
    >
      <body className="min-h-full bg-page text-ink">{children}</body>
    </html>
  );
}
