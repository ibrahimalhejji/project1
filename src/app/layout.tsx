// The real root layout (with <html> and <body>) lives in app/[locale]/layout.tsx so that
// the language and text direction can follow the URL. This file only satisfies Next.js'
// requirement for a top-level layout and powers the root not-found page.
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
