import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MUHAJ Multi Biz",
  description:
    "MUHAJ Multi Biz - Snacks and More. Nationwide Delivery.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
