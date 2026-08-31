"use client";

import { useState } from "react";

type OutOfStockProduct = {
  id: string;
  href: string;
  sku: string;
  name: string;
  type: "product" | "variation" | "kit";
  status: "out" | "low" | "critical";
};

export function NotificationBell({ products }: { products: OutOfStockProduct[] }) {
  const [open, setOpen] = useState(false);

  if (products.length === 0) {
    return null;
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="relative rounded-full border border-red-200 bg-red-50 p-2 text-red-700 transition hover:bg-red-100"
        aria-label="Notificações de estoque"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-xs font-bold text-white">
          {products.length}
        </span>
      </button>

      {open ? (
        <div className="absolute right-0 z-50 mt-3 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 px-4 py-3">
            <p className="text-sm font-semibold text-slate-950">Alertas de estoque</p>
            <p className="text-xs text-slate-500">Itens zerados ou abaixo do estoque mínimo.</p>
          </div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {products.map((product) => (
              <a key={product.id} href={product.href} onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-950">{product.name}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">SKU: {product.sku}</p>
                <p className={product.status === "low" ? "text-xs text-orange-700" : "text-xs text-red-700"}>
                  {formatAlertMessage(product.type, product.status)}
                </p>
              </a>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatAlertMessage(type: "product" | "variation" | "kit", status: "out" | "low" | "critical") {
  if (status === "critical") {
    return "Kit sem componentes suficientes para venda";
  }

  if (status === "low") {
    return type === "variation" ? "Variação abaixo do estoque mínimo" : "Produto abaixo do estoque mínimo";
  }

  return type === "variation" ? "Variação sem estoque" : "Produto sem estoque";
}
