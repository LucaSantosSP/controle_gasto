import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { NotificationBell } from "./notification-bell";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/sales", label: "Vendas" },
  { href: "/expenses", label: "Gastos" },
  { href: "/stock", label: "Estoque" },
];

export async function Nav() {
  const outOfStockProducts = await prisma.product.findMany({
    where: { quantity: 0 },
    orderBy: { sku: "asc" },
    select: { id: true, sku: true, name: true },
  });

  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="flex items-center gap-3 text-xl font-bold text-slate-950">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <svg
              aria-hidden="true"
              viewBox="0 0 64 64"
              fill="none"
              className="h-8 w-8"
            >
              <path d="M17 28c0-10 8-18 18-18h10" stroke="#16c784" strokeWidth="5" strokeLinecap="round" />
              <path d="M45 6l8 8-8 8" stroke="#16c784" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M47 36c0 10-8 18-18 18H19" stroke="#0f243c" strokeWidth="5" strokeLinecap="round" />
              <path d="M19 58l-8-8 8-8" stroke="#0f243c" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="26" y="32" width="5" height="10" rx="1" fill="#16c784" />
              <rect x="34" y="27" width="5" height="15" rx="1" fill="#16c784" />
              <rect x="42" y="21" width="5" height="21" rx="1" fill="#16c784" />
            </svg>
          </span>
          Fluxo
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <nav className="flex flex-wrap gap-2 text-sm font-medium text-slate-700">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full border border-slate-200 px-4 py-2 transition hover:border-slate-950 hover:bg-slate-950 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <NotificationBell products={outOfStockProducts} />
        </div>
      </div>
    </header>
  );
}
