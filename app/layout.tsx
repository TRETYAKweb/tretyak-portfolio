import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import SmoothScroll from "@/components/SmoothScroll";
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
    <html lang="en" className={`${manrope.variable} antialiased`}>
      {/* Extensions (e.g. ColorZilla) inject attributes on <body> before hydration */}
      <body suppressHydrationWarning>
        <SmoothScroll />
        {children}
      </body>
    </html>
  );
}
