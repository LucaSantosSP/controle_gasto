"use client";

import { useActionState } from "react";
import type { ReactNode } from "react";
import { createProduct } from "@/app/stock/actions";
import { initialActionState } from "@/types/transaction";

export function StockForm() {
  const [state, formAction, pending] = useActionState(createProduct, initialActionState);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={formAction} className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Field label="Nome" error={state.errors?.name?.[0]}>
            <input
              name="name"
              required
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
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="10"
            />
          </Field>
          <Field label="Valor de fabricação" error={state.errors?.manufacturingValue?.[0]}>
            <input
              name="manufacturingValue"
              required
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="15,00"
            />
          </Field>
          <Field label="Valor de venda" error={state.errors?.saleValue?.[0]}>
            <input
              name="saleValue"
              required
              inputMode="decimal"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="28,90"
            />
          </Field>
          <Field label="URL da foto" error={state.errors?.photoUrl?.[0]}>
            <input
              name="photoUrl"
              required
              type="url"
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
            {pending ? "Salvando..." : "+ Novo produto"}
          </button>
        </div>
      </form>
    </section>
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
