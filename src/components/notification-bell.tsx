"use client";

import { useState } from "react";
import Link from "next/link";

type OutOfStockProduct = {
  id: string;
  sku: string;
  name: string;
  type: "product" | "variation";
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
            <p className="text-sm font-semibold text-slate-950">Itens sem estoque</p>
            <p className="text-xs text-slate-500">Quantidade zerada no cadastro de estoque.</p>
          </div>
          <div className="max-h-80 divide-y divide-slate-100 overflow-y-auto">
            {products.map((product) => (
              <Link key={product.id} href="/stock" onClick={() => setOpen(false)} className="block px-4 py-3 hover:bg-slate-50">
                <p className="text-sm font-semibold text-slate-950">{product.name}</p>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">SKU: {product.sku}</p>
                <p className="text-xs text-red-700">{product.type === "variation" ? "Variação sem estoque" : "Produto sem estoque"}</p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
