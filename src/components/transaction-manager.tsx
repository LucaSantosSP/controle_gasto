"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { formatCurrency, formatDate, toInputDate, toMoneyInput } from "@/lib/format";
import { initialActionState, type ActionState, type TransactionRow } from "@/types/transaction";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

type Props = {
  title: string;
  newLabel: string;
  emptyLabel: string;
  records: TransactionRow[];
  createAction: ServerAction;
  updateAction: ServerAction;
  deleteAction: ServerAction;
};

export function TransactionManager({
  title,
  newLabel,
  emptyLabel,
  records,
  createAction,
  updateAction,
  deleteAction,
}: Props) {
  const [editing, setEditing] = useState<TransactionRow | null>(null);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Cadastro</p>
          <h1 className="text-3xl font-bold text-slate-950">{title}</h1>
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

      <TransactionForm
        key={editing ? `edit-${editing.id}` : "create"}
        action={editing ? updateAction : createAction}
        buttonLabel={editing ? "Salvar alterações" : newLabel}
        record={editing}
        onSaved={() => setEditing(null)}
      />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-950">Registros cadastrados</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">Valor Unitário</th>
                <th className="px-5 py-3">Quantidade</th>
                {title === "Vendas" ? <th className="px-5 py-3">Plataforma</th> : null}
                <th className="px-5 py-3">Valor Total</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={title === "Vendas" ? 7 : 6} className="px-5 py-8 text-center text-slate-500">
                    {emptyLabel}
                  </td>
                </tr>
              ) : (
                records.map((record) => (
                  <tr key={record.id} className="align-middle">
                    <td className="px-5 py-4 font-medium text-slate-950">{record.name}</td>
                    <td className="px-5 py-4 text-slate-700">{formatCurrency(record.unitValue)}</td>
                    <td className="px-5 py-4 text-slate-700">{record.quantity}</td>
                    {title === "Vendas" ? <td className="px-5 py-4 text-slate-700">{formatPlatform(record.platform)}</td> : null}
                    <td className="px-5 py-4 font-semibold text-slate-950">{formatCurrency(record.totalValue)}</td>
                    <td className="px-5 py-4 text-slate-700">{formatDate(record.date)}</td>
                    <td className="px-5 py-4">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(record)}
                          className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                        >
                          Editar
                        </button>
                        <DeleteForm action={deleteAction} id={record.id} />
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

function TransactionForm({
  action,
  buttonLabel,
  record,
  onSaved,
}: {
  action: ServerAction;
  buttonLabel: string;
  record: TransactionRow | null;
  onSaved: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [unitValue, setUnitValue] = useState(record ? toMoneyInput(record.unitValue) : "");
  const [quantity, setQuantity] = useState(record?.quantity.toString() ?? "1");

  const total = useMemo(() => {
    const normalizedUnit = Number(normalizeMoneyText(unitValue));
    const parsedQuantity = Number(quantity);

    if (Number.isNaN(normalizedUnit) || Number.isNaN(parsedQuantity)) {
      return 0;
    }

    return normalizedUnit * parsedQuantity;
  }, [quantity, unitValue]);

  useEffect(() => {
    if (!state.ok) {
      return;
    }

    if (record) {
      onSaved();
      return;
    }
  }, [onSaved, record, state.ok]);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <form action={formAction} className="space-y-5">
        {record ? <input type="hidden" name="id" value={record.id} /> : null}
        <div className="grid gap-4 md:grid-cols-4">
          <Field label="Nome" error={state.errors?.name?.[0]}>
            <input
              name="name"
              required
              defaultValue={record?.name ?? ""}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="Ex.: Vaso Recife"
            />
          </Field>
          <Field label="Valor unitário" error={state.errors?.unitValue?.[0]}>
            <input
              name="unitValue"
              required
              inputMode="decimal"
              value={unitValue}
              onChange={(event) => setUnitValue(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="28,90"
            />
          </Field>
          <Field label="Quantidade" error={state.errors?.quantity?.[0]}>
            <input
              name="quantity"
              required
              type="number"
              min="1"
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            />
          </Field>
          <Field label="Data" error={state.errors?.date?.[0]}>
            <input
              name="date"
              required
              type="date"
              defaultValue={record ? toInputDate(record.date) : toInputDate(new Date())}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            />
          </Field>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="rounded-lg bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-900">
            Total: {formatCurrency(total)}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {state.message ? (
              <p className={`text-sm font-medium ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
            ) : null}
            <button
              type="submit"
              disabled={pending}
              className="rounded-lg bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Salvando..." : buttonLabel}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}

function normalizeMoneyText(value: string) {
  if (value.includes(",")) {
    return value.replace(/\./g, "").replace(",", ".");
  }

  const parts = value.split(".");

  if (parts.length > 1 && parts.at(-1)?.length === 3) {
    return parts.join("");
  }

  return value;
}

function formatPlatform(platform?: string) {
  if (platform === "SHOPEE") {
    return "Shopee";
  }

  return "Pessoalmente";
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

function DeleteForm({ action, id }: { action: ServerAction; id: number }) {
  const [state, formAction, pending] = useActionState(action, initialActionState);

  return (
    <form
      action={formAction}
      onSubmit={(event) => {
        if (!window.confirm("Deseja realmente excluir este registro?")) {
          event.preventDefault();
        }
      }}
      className="flex items-center gap-2"
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Excluindo..." : "Excluir"}
      </button>
      {state.message && !state.ok ? <span className="sr-only">{state.message}</span> : null}
    </form>
  );
}
