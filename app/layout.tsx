import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lockhouse",
  description: "A family house for papers, locked in your browser.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
