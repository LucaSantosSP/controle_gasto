import { StockForm } from "@/components/stock-form";
import { formatCurrency } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function StockPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Cadastro</p>
        <h1 className="text-3xl font-bold text-slate-950">Estoque</h1>
      </div>

      <StockForm />

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Produtos cadastrados</h2>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
            Nenhum produto cadastrado.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="aspect-[4/3] bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={product.photoUrl} alt={product.name} className="h-full w-full object-cover" />
                </div>
                <div className="space-y-3 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{product.name}</h3>
                    <p className="text-sm text-slate-500">Quantidade: {product.quantity}</p>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      Fabricação: <strong className="text-slate-950">{formatCurrency(product.manufacturingValue.toString())}</strong>
                    </p>
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                      Venda: <strong>{formatCurrency(product.saleValue.toString())}</strong>
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
