"use client";

import { useActionState, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { formatCurrency, toMoneyInput } from "@/lib/format";
import { roundMoney } from "@/lib/shopee";
import { initialActionState, type ActionState, type ShippingPackageRow } from "@/types/transaction";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export function ShippingPackageManager({
  packages,
  createAction,
  updateAction,
  deleteAction,
}: {
  packages: ShippingPackageRow[];
  createAction: ServerAction;
  updateAction: ServerAction;
  deleteAction: ServerAction;
}) {
  const [editing, setEditing] = useState<ShippingPackageRow | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Cadastro</p>
          <h1 className="text-3xl font-bold text-slate-950">Pacotes de envio</h1>
        </div>
        {editing ? (
          <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Cancelar edição
          </button>
        ) : null}
      </div>

      <ShippingPackageForm
        key={editing ? `edit-${editing.id}` : "create"}
        action={editing ? updateAction : createAction}
        packageRow={editing}
        onSaved={() => setEditing(null)}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Pacotes cadastrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Quantidade</th>
                <th className="px-5 py-3">Valor total</th>
                <th className="px-5 py-3">Valor unitário</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-500">Nenhum pacote cadastrado.</td>
                </tr>
              ) : (
                packages.map((shippingPackage) => (
                  <tr key={shippingPackage.id}>
                    <td className="px-5 py-4 font-medium text-slate-950">{shippingPackage.name}</td>
                    <td className="px-5 py-4 text-slate-700">{shippingPackage.quantity}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(shippingPackage.totalValue)}</td>
                    <td className="px-5 py-4 font-semibold text-slate-950">{formatCurrency(shippingPackage.unitValue)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setEditing(shippingPackage)} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                          Editar
                        </button>
                        <DeleteForm action={deleteAction} id={shippingPackage.id} />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function ShippingPackageForm({ action, packageRow, onSaved }: { action: ServerAction; packageRow: ShippingPackageRow | null; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [quantity, setQuantity] = useState(packageRow?.quantity.toString() ?? "1");
  const [totalValue, setTotalValue] = useState(packageRow ? toMoneyInput(packageRow.totalValue) : "");
  const parsedQuantity = Number(quantity);
  const parsedTotalValue = parseMoney(totalValue);
  const unitValue = parsedQuantity > 0 && typeof parsedTotalValue === "number" ? roundMoney(parsedTotalValue / parsedQuantity) : 0;

  useEffect(() => {
    if (state.ok && packageRow) {
      onSaved();
    }
  }, [onSaved, packageRow, state.ok]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={formAction} className="space-y-5">
        {packageRow ? <input type="hidden" name="id" value={packageRow.id} /> : null}
        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Nome" error={state.errors?.name?.[0]}>
            <input name="name" required defaultValue={packageRow?.name ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="Ex.: Caixa pequena" />
          </Field>
          <Field label="Quantidade" error={state.errors?.quantity?.[0]}>
            <input name="quantity" required type="number" min="1" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" />
          </Field>
          <Field label="Valor total" error={state.errors?.totalValue?.[0]}>
            <input name="totalValue" required inputMode="decimal" value={totalValue} onChange={(event) => setTotalValue(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="25,00" />
          </Field>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">Valor unitário: {formatCurrency(unitValue)}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {state.message ? <p className={`text-sm font-medium ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p> : null}
            <button type="submit" disabled={pending} className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? "Salvando..." : packageRow ? "Salvar alterações" : "+ Novo pacote"}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function DeleteForm({ action, id }: { action: ServerAction; id: number }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Deseja realmente excluir este pacote?")) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" disabled={pending} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60">
        {pending ? "Excluindo..." : "Excluir"}
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

function parseMoney(value: string) {
  const normalized = value.trim().includes(",") ? value.trim().replace(/\./g, "").replace(",", ".") : value.trim();
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? undefined : parsed;
}
