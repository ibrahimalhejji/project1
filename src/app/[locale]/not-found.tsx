import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-24 text-center">
      <p className="text-6xl font-black text-brand-700">404</p>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">الصفحة غير موجودة · Page not found</h1>
      <p className="mt-2 text-slate-600">الصفحة التي تبحث عنها غير موجودة أو تم نقلها. · The page you are looking for does not exist or has moved.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Link href="/ar" className="btn-primary">الرئيسية</Link>
        <Link href="/en" className="btn-outline">Home</Link>
      </div>
    </div>
  );
}
