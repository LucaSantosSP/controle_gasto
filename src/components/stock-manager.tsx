"use client";

import { useActionState, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createProduct, deleteProduct, duplicateProduct, updateProduct } from "@/app/stock/actions";
import { formatCurrency, toMoneyInput } from "@/lib/format";
import { initialActionState, type ActionState, type ProductRow } from "@/types/transaction";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function StockManager({ products }: { products: ProductRow[] }) {
  const [editing, setEditing] = useState<ProductRow | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Cadastro</p>
          <h1 className="text-3xl font-bold text-slate-950">Estoque</h1>
        </div>
        {editing ? (
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancelar edição
          </button>
        ) : null}
      </div>

      <ProductForm key={editing ? `edit-${editing.id}` : "create"} product={editing} onSaved={() => setEditing(null)} />

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
                <div className="space-y-4 p-5">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">{product.name}</h3>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">SKU: {product.sku}</p>
                    <p className="text-sm text-slate-500">Quantidade: {product.quantity}</p>
                  </div>
                  <div className="grid gap-2 text-sm sm:grid-cols-2">
                    <p className="rounded-lg bg-slate-100 px-3 py-2 text-slate-700">
                      Fabricação: <strong className="text-slate-950">{formatCurrency(product.manufacturingValue)}</strong>
                    </p>
                    <p className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-800">
                      Venda: <strong>{formatCurrency(product.saleValue)}</strong>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing(product)}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <ProductActionForm action={duplicateProduct} id={product.id} label="Duplicar" />
                    <ProductActionForm action={deleteProduct} id={product.id} label="Excluir" danger confirm="Deseja realmente excluir este produto?" />
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

function ProductForm({ product, onSaved }: { product: ProductRow | null; onSaved: () => void }) {
  const action = product ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, initialActionState);

  useEffect(() => {
    if (state.ok && product) {
      onSaved();
    }
  }, [onSaved, product, state.ok]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={formAction} className="space-y-5">
        {product ? <input type="hidden" name="id" value={product.id} /> : null}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="SKU" error={state.errors?.sku?.[0]}>
            <input
              name="sku"
              required
              maxLength={100}
              defaultValue={product?.sku ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="Ex.: VASO-RECIFE-001"
            />
          </Field>
          <Field label="Nome" error={state.errors?.name?.[0]}>
            <input
              name="name"
              required
              defaultValue={product?.name ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="Ex.: Vaso Recife"
            />
          </Field>
          <Field label="Quantidade" error={state.errors?.quantity?.[0]}>
            <input
              name="quantity"
              required
              type="number"
              min="0"
              step="1"
              defaultValue={product?.quantity ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="10"
            />
          </Field>
          <Field label="Valor de fabricação" error={state.errors?.manufacturingValue?.[0]}>
            <input
              name="manufacturingValue"
              required
              inputMode="decimal"
              defaultValue={product ? toMoneyInput(product.manufacturingValue) : ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="15,00"
            />
          </Field>
          <Field label="Valor de venda" error={state.errors?.saleValue?.[0]}>
            <input
              name="saleValue"
              required
              inputMode="decimal"
              defaultValue={product ? toMoneyInput(product.saleValue) : ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="28,90"
            />
          </Field>
          <Field label="URL da foto" error={state.errors?.photoUrl?.[0]}>
            <input
              name="photoUrl"
              required
              type="url"
              defaultValue={product?.photoUrl ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="https://exemplo.com/foto.jpg"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {state.message ? (
            <p className={`text-sm font-medium ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Salvando..." : product ? "Salvar alterações" : "+ Novo produto"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ProductActionForm({
  action,
  id,
  label,
  danger,
  confirm,
}: {
  action: ServerAction;
  id: number;
  label: string;
  danger?: boolean;
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (confirm && !window.confirm(confirm)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className={
          danger
            ? "rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            : "rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {pending ? "Processando..." : label}
      </button>
      {state.message && !state.ok ? <span className="sr-only">{state.message}</span> : null}
    </form>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: ReactNode }) {
  return (
    <label className="space-y-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {children}
      {error ? <span className="block text-xs font-semibold text-red-700">{error}</span> : null}
    </label>
  );
}
