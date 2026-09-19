import type { Metadata } from "next";
import { Inter, Spectral } from "next/font/google";
import "./globals.css";

// Inter: a plain workhorse sans for headings and UI copy -- Operate
// surfaces are well served by a system-stack-adjacent face, so the
// craft budget goes into the numerals instead. Spectral is reserved for
// every NUMBER on the page (rate, score, percentages, the clock): a
// formal serif with real tabular figures, set in ruled columns like a
// nautical almanac's daily tables -- the direct replacement for the
// seven-segment instrument readouts the user found hard to read.
const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spectral = Spectral({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "AUD/THB Forecast Dashboard",
  description: "Market monitoring and FX signal model for AUD/THB",
};

// Runs before paint so the page never flashes the wrong theme. Defaults
// to dark (the app's original look) unless the visitor already chose
// light on a previous visit.
const themeInitScript = `
try {
  var theme = localStorage.getItem('theme');
  if (theme !== 'light') {
    document.documentElement.classList.add('dark');
  }
} catch (e) {
  document.documentElement.classList.add('dark');
}
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spectral.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
