import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import Boot from "@/components/layout/Boot";
import InlineScript from "@/components/layout/InlineScript";
import SmoothScroll from "@/components/layout/SmoothScroll";
import { BOOT_SCRIPT } from "@/lib/boot";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Yevhenii Tretyak — UI/UX Designer & Webflow Developer",
  description:
    "Portfolio of Yevhenii Tretyak, a Kyiv-based UI/UX designer and Webflow developer with 10+ years of experience.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script sets data-preload / data-booted on <html> before hydration
    <html lang="en" className={`${manrope.variable} antialiased`} suppressHydrationWarning>
      {/* Extensions (e.g. ColorZilla) inject attributes on <body> before hydration */}
      <body suppressHydrationWarning>
        <InlineScript html={BOOT_SCRIPT} />
        <div className="boot-cover" aria-hidden />
        <noscript>
          <style>{".boot-cover{display:none}"}</style>
        </noscript>
        <Boot />
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
