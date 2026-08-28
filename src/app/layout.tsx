import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DocChat",
  description: "Grounded document chat for French and Arabic PDFs.",
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
