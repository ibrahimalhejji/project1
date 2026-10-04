import Link from "next/link";
import "./globals.css";

export default function RootNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-6xl font-black text-brand-700">404</p>
          <h1 className="mt-2 text-xl font-bold">الصفحة غير موجودة · Page not found</h1>
          <Link href="/ar" className="btn-primary mt-6">العودة إلى الرئيسية · Home</Link>
        </div>
      </body>
    </html>
  );
}
