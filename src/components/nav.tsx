import Link from "next/link";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/sales", label: "Vendas" },
  { href: "/expenses", label: "Gastos" },
];

export function Nav() {
  return (
    <header className="border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/" className="text-xl font-bold text-slate-950">
          Controle da Loja
        </Link>
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
      </div>
    </header>
  );
}
