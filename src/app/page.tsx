import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { parsePeriod } from "@/lib/validation";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function DashboardPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const period = parsePeriod(params);
  const dateWhere = buildDateWhere(period.startDate, period.endDate);

  const [salesTotal, expensesTotal, recentSales, recentExpenses] = await Promise.all([
    prisma.sale.aggregate({ _sum: { totalValue: true }, where: dateWhere ? { date: dateWhere } : undefined }),
    prisma.expense.aggregate({ _sum: { totalValue: true }, where: dateWhere ? { date: dateWhere } : undefined }),
    prisma.sale.findMany({ where: dateWhere ? { date: dateWhere } : undefined, orderBy: { date: "desc" }, take: 5 }),
    prisma.expense.findMany({ where: dateWhere ? { date: dateWhere } : undefined, orderBy: { date: "desc" }, take: 5 }),
  ]);

  const totalSales = Number(salesTotal._sum.totalValue ?? 0);
  const totalExpenses = Number(expensesTotal._sum.totalValue ?? 0);
  const profit = totalSales - totalExpenses;

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Dashboard</p>
          <h1 className="text-3xl font-bold text-slate-950">Resumo financeiro</h1>
        </div>
        <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Data Inicial</span>
            <input
              type="date"
              name="startDate"
              defaultValue={period.startDate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            />
          </label>
          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>Data Final</span>
            <input
              type="date"
              name="endDate"
              defaultValue={period.endDate}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            />
          </label>
          <button className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800" type="submit">
            Filtrar
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-5 py-3 text-center text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Limpar
          </Link>
        </form>
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Vendas" value={totalSales} tone="emerald" />
          <SummaryCard label="Gastos" value={totalExpenses} tone="red" />
          <SummaryCard label="Lucro" value={profit} tone={profit >= 0 ? "blue" : "red"} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <RecentList title="Vendas recentes" href="/sales" records={recentSales.map(toRecentRecord)} empty="Nenhuma venda encontrada." />
        <RecentList title="Gastos recentes" href="/expenses" records={recentExpenses.map(toRecentRecord)} empty="Nenhum gasto encontrado." />
      </section>
    </div>
  );
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: "emerald" | "red" | "blue" }) {
  const colors = {
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-800",
    red: "border-red-200 bg-red-50 text-red-800",
    blue: "border-blue-200 bg-blue-50 text-blue-800",
  };

  return (
    <article className={`rounded-2xl border p-5 shadow-sm ${colors[tone]}`}>
      <p className="text-sm font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <strong className="mt-3 block text-3xl font-bold">{formatCurrency(value)}</strong>
    </article>
  );
}

function RecentList({
  title,
  href,
  records,
  empty,
}: {
  title: string;
  href: string;
  records: Array<{ id: number; name: string; totalValue: string; date: Date }>;
  empty: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-slate-700 hover:text-slate-950">
          Ver todos
        </Link>
      </div>
      <div className="divide-y divide-slate-100">
        {records.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-slate-500">{empty}</p>
        ) : (
          records.map((record) => (
            <div key={record.id} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <p className="font-medium text-slate-950">{record.name}</p>
                <p className="text-sm text-slate-500">{formatDate(record.date)}</p>
              </div>
              <strong className="text-slate-950">{formatCurrency(record.totalValue)}</strong>
            </div>
          ))
        )}
      </div>
    </article>
  );
}

function buildDateWhere(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) {
    return undefined;
  }

  return {
    ...(startDate ? { gte: new Date(`${startDate}T00:00:00.000Z`) } : {}),
    ...(endDate ? { lte: new Date(`${endDate}T00:00:00.000Z`) } : {}),
  };
}

function toRecentRecord(record: { id: number; name: string; totalValue: { toString(): string }; date: Date }) {
  return {
    id: record.id,
    name: record.name,
    totalValue: record.totalValue.toString(),
    date: record.date,
  };
}
