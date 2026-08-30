"use client";

import { useActionState, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { createKit, createProduct, createVariation, deleteProduct, duplicateProduct, sellProduct, updateProduct, updateVariation } from "@/app/stock/actions";
import { formatCurrency, toInputDate, toMoneyInput } from "@/lib/format";
import { calculateShopeeFee, roundMoney } from "@/lib/shopee";
import { initialActionState, type ActionState, type ProductRow, type ProductVariationRow } from "@/types/transaction";

type ServerAction = (state: ActionState, formData: FormData) => Promise<ActionState>;
type ProductSelectionDraft = { productId: string; variationId: string; quantity: string };

export function StockManager({ products }: { products: ProductRow[] }) {
  const [editing, setEditing] = useState<ProductRow | null>(null);
  const [selling, setSelling] = useState<ProductRow | null>(null);
  const [addingVariation, setAddingVariation] = useState<ProductRow | null>(null);
  const [editingVariation, setEditingVariation] = useState<{ product: ProductRow; variationId: number } | null>(null);
  const [creatingKit, setCreatingKit] = useState(false);
  const [search, setSearch] = useState("");
  const filteredProducts = products.filter((product) => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return true;
    }

    return product.name.toLowerCase().includes(normalizedSearch) || product.sku.toLowerCase().includes(normalizedSearch);
  });

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
        ) : (
          <button
            type="button"
            onClick={() => setCreatingKit((current) => !current)}
            className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            {creatingKit ? "Cancelar kit" : "Criar kit"}
          </button>
        )}
      </div>

      {creatingKit && !editing ? (
        <KitForm products={products} onSaved={() => setCreatingKit(false)} />
      ) : (
        <ProductForm key={editing ? `edit-${editing.id}` : "create"} product={editing} onSaved={() => setEditing(null)} />
      )}

      <section className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Produtos cadastrados</h2>
            <p className="text-sm text-slate-500">
              {filteredProducts.length} de {products.length} produto(s) exibido(s)
            </p>
          </div>
          <label className="w-full space-y-2 text-sm font-medium text-slate-700 sm:max-w-sm">
            <span>Pesquisar produto</span>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="Buscar por nome ou SKU"
            />
          </label>
        </div>
        {products.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
            Nenhum produto cadastrado.
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
            Nenhum produto encontrado para a pesquisa informada.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => (
              <article key={product.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <ProductMedia product={product} />
                <div className="space-y-4 p-5">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-lg font-semibold text-slate-950">{product.name}</h3>
                      {product.isKit ? (
                        <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold uppercase tracking-wide text-blue-800">Kit</span>
                      ) : null}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">SKU: {product.sku}</p>
                    <p className="text-sm text-slate-500">Estoque: {product.quantity}</p>
                    <p className="text-sm text-slate-500">Vendidos: {product.soldQuantity}</p>
                  </div>
                  {product.components.length > 0 ? (
                    <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm text-blue-950">
                      <p className="mb-2 font-semibold">Composição do kit</p>
                      <div className="space-y-1">
                        {product.components.map((component) => (
                          <p key={`${component.componentId}:${component.variationId ?? ""}`}>
                            {component.quantity}x {component.name} <span className="text-blue-700">({component.sku})</span>
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {product.variations.length > 0 ? (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                      <p className="mb-2 font-semibold text-slate-950">Variações</p>
                      <div className="space-y-1">
                        {product.variations.map((variation) => (
                          <div key={variation.id} className="flex flex-wrap items-center justify-between gap-2">
                            <p className={variation.quantity <= 0 ? "font-semibold text-red-700" : ""}>
                              {variation.name}: estoque {variation.quantity}, venda {formatCurrency(variation.saleValue)}
                              {variation.quantity <= 0 ? " | Sem estoque" : ""}
                            </p>
                            <button
                              type="button"
                              onClick={() => setEditingVariation({ product, variationId: variation.id })}
                              className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                            >
                              Editar
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
                      onClick={() => {
                        setEditing(product);
                        scrollToTop();
                      }}
                      className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelling(product)}
                      disabled={product.quantity <= 0 && product.variations.every((variation) => variation.quantity <= 0)}
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Vendido
                    </button>
                    <ProductActionForm action={duplicateProduct} id={product.id} label="Duplicar" />
                    <button
                      type="button"
                      onClick={() => setAddingVariation(product)}
                      className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                    >
                      Variação
                    </button>
                    <ProductActionForm action={deleteProduct} id={product.id} label="Excluir" danger confirm="Deseja realmente excluir este produto?" />
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      {selling ? <SellProductModal product={selling} products={products} onClose={() => setSelling(null)} /> : null}
      {addingVariation ? <VariationModal product={addingVariation} onClose={() => setAddingVariation(null)} /> : null}
      {editingVariation ? (
        <VariationModal
          product={editingVariation.product}
          variation={editingVariation.product.variations.find((variation) => variation.id === editingVariation.variationId)}
          onClose={() => setEditingVariation(null)}
        />
      ) : null}
    </div>
  );
}

function SellProductModal({ product, products, onClose }: { product: ProductRow; products: ProductRow[]; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(sellProduct, initialActionState);
  const [saleItems, setSaleItems] = useState<ProductSelectionDraft[]>([{ productId: product.id.toString(), variationId: "", quantity: "1" }]);
  const [giftItems, setGiftItems] = useState<ProductSelectionDraft[]>([]);
  const [platform, setPlatform] = useState("PERSONAL");
  const [discountType, setDiscountType] = useState("NONE");
  const [discountValue, setDiscountValue] = useState("");
  const [finalValue, setFinalValue] = useState("");
  const [pickingSaleItemIndex, setPickingSaleItemIndex] = useState<number | null>(null);
  const [pickingGiftItemIndex, setPickingGiftItemIndex] = useState<number | null>(null);

  const validSaleItems = toValidSelectionItems(saleItems);
  const validGiftItems = toValidSelectionItems(giftItems);
  const soldQuantity = validSaleItems.reduce((total, item) => total + item.quantity, 0);
  const grossValue = roundMoney(
    validSaleItems.reduce((total, item) => {
      const selectedProduct = products.find((currentProduct) => currentProduct.id === item.productId);
      const selectedVariation = selectedProduct?.variations.find((variation) => variation.id === item.variationId);

      return total + (selectedProduct ? Number(selectedVariation?.saleValue ?? selectedProduct.saleValue) * item.quantity : 0);
    }, 0)
  );
  const manualFinalValue = parseMoney(finalValue);
  const discount = calculateDiscount(grossValue, discountType, parseMoney(discountValue), manualFinalValue);
  const valueBeforeFee = typeof manualFinalValue === "number" ? manualFinalValue : roundMoney(Math.max(grossValue - discount, 0));
  const itemValueBeforeFee = soldQuantity > 0 ? roundMoney(valueBeforeFee / soldQuantity) : 0;
  const platformFee = platform === "SHOPEE" ? calculateShopeeFee(itemValueBeforeFee, soldQuantity) : 0;
  const netValue = roundMoney(Math.max(valueBeforeFee - platformFee, 0));
  const saleManufacturingCost = calculateSelectionManufacturingCost(validSaleItems, products);
  const giftManufacturingCost = calculateSelectionManufacturingCost(validGiftItems, products);
  const totalManufacturingCost = roundMoney(saleManufacturingCost + giftManufacturingCost);
  const serializedItems = JSON.stringify(validSaleItems);
  const serializedGiftItems = JSON.stringify(validGiftItems);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Venda de produto</p>
            <h2 className="text-2xl font-bold text-slate-950">Nova venda</h2>
            <p className="text-sm text-slate-500">Produto inicial: {product.name} | SKU: {product.sku}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Fechar
          </button>
        </div>

        <form action={formAction} className="space-y-5">
          <input type="hidden" name="items" value={serializedItems} />
          <input type="hidden" name="giftItems" value={serializedGiftItems} />
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-950">Itens da venda</h3>
              <button
                type="button"
                onClick={() => {
                  setSaleItems((current) => [...current, { productId: "", variationId: "", quantity: "1" }]);
                  setPickingSaleItemIndex(saleItems.length);
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Adicionar produto
              </button>
            </div>
            {saleItems.map((item, index) => {
              const selectedProduct = products.find((currentProduct) => currentProduct.id === Number(item.productId));

              return (
                <SelectionItemCard
                  key={index}
                  item={item}
                  selectedProduct={selectedProduct}
                  onPick={() => setPickingSaleItemIndex(index)}
                  onVariationChange={(variationId) =>
                    setSaleItems((current) => current.map((currentItem, itemIndex) => (itemIndex === index ? { ...currentItem, variationId } : currentItem)))
                  }
                  onQuantityChange={(quantity) =>
                    setSaleItems((current) => current.map((currentItem, itemIndex) => (itemIndex === index ? { ...currentItem, quantity } : currentItem)))
                  }
                  onRemove={() => setSaleItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  disableRemove={saleItems.length === 1}
                />
              );
            })}
          </div>
          {pickingSaleItemIndex !== null ? (
            <ProductPickerModal
              title="Escolher item da venda"
              products={products}
              onClose={() => setPickingSaleItemIndex(null)}
              onSelect={(selectedProduct) => {
                setSaleItems((current) =>
                  current.map((item, index) =>
                    index === pickingSaleItemIndex ? { ...item, productId: selectedProduct.id.toString(), variationId: "" } : item
                  )
                );
                setPickingSaleItemIndex(null);
              }}
            />
          ) : null}
          <div className="space-y-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-slate-950">Brindes</h3>
                <p className="text-xs text-slate-600">Baixam do estoque, mas não entram no valor da venda.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setGiftItems((current) => [...current, { productId: "", variationId: "", quantity: "1" }]);
                  setPickingGiftItemIndex(giftItems.length);
                }}
                className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100"
              >
                Adicionar brinde
              </button>
            </div>
            {giftItems.length === 0 ? (
              <p className="text-sm text-slate-600">Nenhum brinde adicionado.</p>
            ) : (
              giftItems.map((item, index) => {
                const selectedProduct = products.find((currentProduct) => currentProduct.id === Number(item.productId));

                return (
                  <SelectionItemCard
                    key={index}
                    item={item}
                    selectedProduct={selectedProduct}
                    onPick={() => setPickingGiftItemIndex(index)}
                    onVariationChange={(variationId) =>
                      setGiftItems((current) => current.map((currentItem, itemIndex) => (itemIndex === index ? { ...currentItem, variationId } : currentItem)))
                    }
                    onQuantityChange={(quantity) =>
                      setGiftItems((current) => current.map((currentItem, itemIndex) => (itemIndex === index ? { ...currentItem, quantity } : currentItem)))
                    }
                    onRemove={() => setGiftItems((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    accent="amber"
                  />
                );
              })
            )}
          </div>
          {pickingGiftItemIndex !== null ? (
            <ProductPickerModal
              title="Escolher brinde"
              products={products}
              onClose={() => setPickingGiftItemIndex(null)}
              onSelect={(selectedProduct) => {
                setGiftItems((current) =>
                  current.map((item, index) =>
                    index === pickingGiftItemIndex ? { ...item, productId: selectedProduct.id.toString(), variationId: "" } : item
                  )
                );
                setPickingGiftItemIndex(null);
              }}
            />
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Data da venda" error={state.errors?.date?.[0]}>
              <input
                name="date"
                type="date"
                required
                defaultValue={toInputDate(new Date())}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              />
            </Field>
            <Field label="Plataforma" error={state.errors?.platform?.[0]}>
              <select
                name="platform"
                value={platform}
                onChange={(event) => setPlatform(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              >
                <option value="PERSONAL">Vendido pessoalmente</option>
                <option value="SHOPEE">Vendido na Shopee</option>
              </select>
            </Field>
            <Field label="Tipo de desconto" error={state.errors?.discountType?.[0]}>
              <select
                name="discountType"
                value={discountType}
                onChange={(event) => setDiscountType(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              >
                <option value="NONE">Sem desconto</option>
                <option value="FIXED">Desconto em reais</option>
                <option value="PERCENT">Desconto em porcentagem</option>
              </select>
            </Field>
            <Field label={discountType === "PERCENT" ? "Desconto (%)" : "Desconto (R$)"} error={state.errors?.discountValue?.[0]}>
              <input
                name="discountValue"
                inputMode="decimal"
                disabled={discountType === "NONE" || finalValue.trim().length > 0}
                value={discountValue}
                onChange={(event) => setDiscountValue(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950 disabled:bg-slate-100"
                placeholder={discountType === "PERCENT" ? "10" : "5,00"}
              />
            </Field>
            <Field label="Alterar valor final (opcional)" error={state.errors?.finalValue?.[0]}>
              <input
                name="finalValue"
                inputMode="decimal"
                value={finalValue}
                onChange={(event) => setFinalValue(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
                placeholder={toMoneyInput(grossValue)}
              />
            </Field>
          </div>

          <div className="grid gap-3 rounded-2xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
            <p>Valor bruto: <strong>{formatCurrency(grossValue)}</strong></p>
            <p>Desconto aplicado: <strong>{formatCurrency(discount)}</strong></p>
            <p>Taxa da plataforma: <strong>{formatCurrency(platformFee)}</strong></p>
            <p>Valor líquido da venda: <strong>{formatCurrency(netValue)}</strong></p>
            <p>Custo fabricação itens: <strong>{formatCurrency(saleManufacturingCost)}</strong></p>
            <p>Custo fabricação brindes: <strong>{formatCurrency(giftManufacturingCost)}</strong></p>
            <p className="sm:col-span-2">Custo fabricação total: <strong>{formatCurrency(totalManufacturingCost)}</strong></p>
          </div>

          {platform === "SHOPEE" ? (
            <p className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
              Shopee CPF: cálculo automático usando comissão por faixa de preço e tarifa fixa. Para produtos abaixo de R$ 12,00, a tarifa fixa é limitada a até 50% do valor do item.
            </p>
          ) : null}

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {state.message ? (
              <p className={`text-sm font-medium ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
            ) : null}
            <button
              type="submit"
              disabled={pending || soldQuantity <= 0}
              className="rounded-lg bg-emerald-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {pending ? "Lançando..." : "Confirmar venda"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function SelectionItemCard({
  item,
  selectedProduct,
  onPick,
  onVariationChange,
  onQuantityChange,
  onRemove,
  disableRemove,
  accent = "slate",
}: {
  item: ProductSelectionDraft;
  selectedProduct?: ProductRow;
  onPick: () => void;
  onVariationChange: (variationId: string) => void;
  onQuantityChange: (quantity: string) => void;
  onRemove: () => void;
  disableRemove?: boolean;
  accent?: "slate" | "amber";
}) {
  const borderClass = accent === "amber" ? "border-amber-200" : "border-slate-200";
  const controlClass = accent === "amber" ? "border-amber-300 focus:border-amber-700 disabled:bg-amber-100" : "border-slate-300 focus:border-slate-950 disabled:bg-slate-100";
  const hoverClass = accent === "amber" ? "hover:bg-amber-50" : "hover:bg-slate-50";
  const quantityLimit = item.variationId ? selectedProduct?.variations.find((variation) => variation.id === Number(item.variationId))?.quantity : selectedProduct?.quantity;

  return (
    <div className={`space-y-3 rounded-xl border ${borderClass} bg-white p-3 shadow-sm`}>
      <button
        type="button"
        onClick={onPick}
        className={`w-full rounded-lg border ${controlClass} px-3 py-2 text-left text-sm outline-none ${hoverClass}`}
      >
        {selectedProduct ? (
          <span className="block leading-relaxed">
            <strong className="text-slate-950">{selectedProduct.sku}</strong> - {selectedProduct.name}
            {selectedProduct.isKit ? " (kit)" : ""} | Estoque: {selectedProduct.quantity}
          </span>
        ) : (
          <span className="text-slate-500">Escolher produto ou kit</span>
        )}
      </button>
      <div className="grid gap-3 sm:grid-cols-[1fr_110px_auto]">
        <select
          value={item.variationId}
          onChange={(event) => onVariationChange(event.target.value)}
          disabled={!selectedProduct || selectedProduct.variations.length === 0}
          className={`w-full rounded-lg border ${controlClass} bg-white px-3 py-2 outline-none`}
        >
          <option value="">Sem variação</option>
          {selectedProduct?.variations.map((variation) => (
            <option key={variation.id} value={variation.id}>
              {variation.name} | Estoque: {variation.quantity}
            </option>
          ))}
        </select>
        <input
          type="number"
          min="1"
          max={quantityLimit}
          step="1"
          value={item.quantity}
          onChange={(event) => onQuantityChange(event.target.value)}
          className={`w-full rounded-lg border ${controlClass} bg-white px-3 py-2 outline-none`}
          placeholder="Qtd."
        />
        <button
          type="button"
          onClick={onRemove}
          disabled={disableRemove}
          className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Remover
        </button>
      </div>
    </div>
  );
}

function VariationModal({ product, variation, onClose }: { product: ProductRow; variation?: ProductVariationRow; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(variation ? updateVariation : createVariation, initialActionState);
  const [sku, setSku] = useState(variation?.sku ?? "");
  const [name, setName] = useState(variation?.name ?? "");
  const [quantity, setQuantity] = useState(variation?.quantity.toString() ?? "0");
  const [soldQuantity, setSoldQuantity] = useState(variation?.soldQuantity.toString() ?? "0");
  const [manufacturingValue, setManufacturingValue] = useState(variation ? toMoneyInput(variation.manufacturingValue) : toMoneyInput(product.manufacturingValue));
  const [saleValue, setSaleValue] = useState(variation ? toMoneyInput(variation.saleValue) : toMoneyInput(product.saleValue));

  useEffect(() => {
    if (state.ok) {
      onClose();
    }
  }, [onClose, state.ok]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <section className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-slate-500">{variation ? "Editar variação" : "Nova variação"}</p>
            <h2 className="text-2xl font-bold text-slate-950">{product.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
            Fechar
          </button>
        </div>
        <form action={formAction} className="space-y-5">
          {variation ? <input type="hidden" name="id" value={variation.id} /> : null}
          <input type="hidden" name="productId" value={product.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="SKU da variação (opcional)" error={state.errors?.sku?.[0]}>
              <input name="sku" maxLength={100} value={sku} onChange={(event) => setSku(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder={`${product.sku}-AZUL`} />
            </Field>
            <Field label="Nome da variação" error={state.errors?.name?.[0]}>
              <input name="name" required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="Ex.: Azul, 500g" />
            </Field>
            <Field label="Quantidade" error={state.errors?.quantity?.[0]}>
              <input name="quantity" type="number" min="0" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" />
            </Field>
            <Field label="Quantidade vendida" error={state.errors?.soldQuantity?.[0]}>
              <input name="soldQuantity" type="number" min="0" step="1" required value={soldQuantity} onChange={(event) => setSoldQuantity(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" />
            </Field>
            <Field label="Valor de fabricação" error={state.errors?.manufacturingValue?.[0]}>
              <input name="manufacturingValue" required inputMode="decimal" value={manufacturingValue} onChange={(event) => setManufacturingValue(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" />
            </Field>
            <Field label="Valor de venda" error={state.errors?.saleValue?.[0]}>
              <input name="saleValue" required inputMode="decimal" value={saleValue} onChange={(event) => setSaleValue(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" />
            </Field>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            {state.message ? (
              <p className={`text-sm font-medium ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
            ) : null}
            <button type="submit" disabled={pending} className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60">
              {pending ? "Salvando..." : variation ? "Salvar alterações" : "Salvar variação"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ProductMedia({ product }: { product: ProductRow }) {
  const componentImages = product.components.filter((component) => component.photoUrl).slice(0, 4);

  return (
    <div className="relative aspect-[4/3] bg-slate-100">
      {product.quantity <= 0 ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
          Sem estoque
        </div>
      ) : null}
      {product.quantity > 0 && product.variations.some((variation) => variation.quantity <= 0) ? (
        <div className="absolute left-3 top-3 z-10 rounded-full bg-orange-500 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white shadow-lg">
          Variação sem estoque
        </div>
      ) : null}
      {product.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.photoUrl} alt={product.name} className="h-full w-full object-cover" />
      ) : product.isKit && componentImages.length > 0 ? (
        <div className={`grid h-full w-full gap-1 p-1 ${componentImages.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
          {componentImages.map((component) => (
            <div key={`${component.componentId}:${component.variationId ?? ""}`} className="relative overflow-hidden rounded-lg bg-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={component.photoUrl} alt={component.name} className="h-full w-full object-cover" />
              <span className="absolute bottom-1 left-1 rounded bg-slate-950/70 px-2 py-1 text-[10px] font-semibold text-white">
                {component.quantity}x
              </span>
            </div>
          ))}
        </div>
      ) : (
        <DefaultProductIcon label={product.isKit ? "Kit sem imagem" : "Sem imagem"} />
      )}
    </div>
  );
}

function DefaultProductIcon({ label }: { label: string }) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-slate-400">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-16 w-16"
      >
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

function ProductPickerModal({
  title,
  products,
  onSelect,
  onClose,
}: {
  title: string;
  products: ProductRow[];
  onSelect: (product: ProductRow) => void;
  onClose: () => void;
}) {
  const [search, setSearch] = useState("");
  const filteredProducts = products.filter((product) => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return true;
    }

    return (
      product.name.toLowerCase().includes(normalizedSearch) ||
      product.sku.toLowerCase().includes(normalizedSearch) ||
      product.variations.some((variation) => variation.name.toLowerCase().includes(normalizedSearch) || variation.sku.toLowerCase().includes(normalizedSearch))
    );
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
      <section className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-200 p-5">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium uppercase tracking-wide text-slate-500">Selecionar item</p>
              <h2 className="text-2xl font-bold text-slate-950">{title}</h2>
            </div>
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100">
              Fechar
            </button>
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
            placeholder="Buscar por nome, SKU ou variação"
            autoFocus
          />
        </div>
        <div className="max-h-[60vh] divide-y divide-slate-100 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Nenhum item encontrado.</p>
          ) : (
            filteredProducts.map((product) => (
              <button key={product.id} type="button" onClick={() => onSelect(product)} className="block w-full px-5 py-4 text-left hover:bg-slate-50">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <ProductPickerThumbnail product={product} />
                    <div>
                      <p className="font-semibold text-slate-950">
                        {product.name} {product.isKit ? <span className="text-xs uppercase text-blue-700">Kit</span> : null}
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">SKU: {product.sku}</p>
                      {product.variations.length > 0 ? (
                        <p className="text-xs text-slate-500">
                          Variações: {product.variations.map((variation) => variation.name).join(", ")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-sm text-slate-600 sm:text-right">
                    <p>Estoque: {product.quantity}</p>
                    <p>{formatCurrency(product.saleValue)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

function ProductPickerThumbnail({ product }: { product: ProductRow }) {
  const componentImage = product.components.find((component) => component.photoUrl);
  const photoUrl = product.photoUrl || componentImage?.photoUrl;

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt={product.name} className="h-full w-full object-cover" />
      ) : (
        <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-7 w-7">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
          <path d="m3.3 7 8.7 5 8.7-5" />
          <path d="M12 22V12" />
        </svg>
      )}
    </div>
  );
}

function KitForm({ products, onSaved }: { products: ProductRow[]; onSaved: () => void }) {
  const [state, formAction, pending] = useActionState(createKit, initialActionState);
  const [sku, setSku] = useState("");
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [soldQuantity, setSoldQuantity] = useState("0");
  const [manufacturingValue, setManufacturingValue] = useState("");
  const [manufacturingValueEdited, setManufacturingValueEdited] = useState(false);
  const [saleValue, setSaleValue] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [components, setComponents] = useState<Array<{ componentId: string; variationId: string; quantity: string }>>([
    { componentId: "", variationId: "", quantity: "1" },
  ]);
  const [pickingComponentIndex, setPickingComponentIndex] = useState<number | null>(null);

  const suggestedManufacturingValue = roundMoney(
    components.reduce((total, component) => {
      const selectedProduct = products.find((product) => product.id === Number(component.componentId));
      const selectedVariation = selectedProduct?.variations.find((variation) => variation.id === Number(component.variationId));
      const componentQuantity = Number(component.quantity) || 0;

      if (!selectedProduct || componentQuantity <= 0) {
        return total;
      }

      return total + Number(selectedVariation?.manufacturingValue ?? selectedProduct.manufacturingValue) * componentQuantity;
    }, 0)
  );

  useEffect(() => {
    if (state.ok) {
      onSaved();
    }
  }, [onSaved, state.ok]);

  const displayedManufacturingValue = manufacturingValueEdited ? manufacturingValue : toMoneyInput(suggestedManufacturingValue);

  const serializedComponents = JSON.stringify(
    components
      .filter((component) => component.componentId && Number(component.quantity) > 0)
      .map((component) => ({
        componentId: Number(component.componentId),
        variationId: component.variationId ? Number(component.variationId) : null,
        quantity: Number(component.quantity),
      }))
  );

  return (
    <section className="rounded-2xl border border-blue-200 bg-blue-50 p-5 shadow-sm">
      <form action={formAction} className="space-y-5">
        <input type="hidden" name="components" value={serializedComponents} />
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Novo kit</p>
          <h2 className="text-xl font-bold text-slate-950">Monte um kit a partir de produtos ou outros kits</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="SKU" error={state.errors?.sku?.[0]}>
            <input name="sku" required maxLength={100} value={sku} onChange={(event) => setSku(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="Ex.: KIT-JARDIM-001" />
          </Field>
          <Field label="Nome" error={state.errors?.name?.[0]}>
            <input name="name" required value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="Ex.: Kit Jardim" />
          </Field>
          <Field label="Quantidade disponível" error={state.errors?.quantity?.[0]}>
            <input name="quantity" required type="number" min="0" step="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="2" />
          </Field>
          <Field label="Quantidade vendida" error={state.errors?.soldQuantity?.[0]}>
            <input name="soldQuantity" required type="number" min="0" step="1" value={soldQuantity} onChange={(event) => setSoldQuantity(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="0" />
          </Field>
          <Field label="Valor de fabricação" error={state.errors?.manufacturingValue?.[0]}>
            <input
              name="manufacturingValue"
              required
              inputMode="decimal"
              value={displayedManufacturingValue}
              onChange={(event) => {
                setManufacturingValueEdited(true);
                setManufacturingValue(event.target.value);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="50,00"
            />
            <span className="block text-xs text-blue-700">Sugestão pela composição: {formatCurrency(suggestedManufacturingValue)}</span>
          </Field>
          <Field label="Valor de venda" error={state.errors?.saleValue?.[0]}>
            <input name="saleValue" required inputMode="decimal" value={saleValue} onChange={(event) => setSaleValue(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="89,90" />
          </Field>
          <Field label="URL da foto (opcional)" error={state.errors?.photoUrl?.[0]}>
            <input name="photoUrl" type="url" value={photoUrl} onChange={(event) => setPhotoUrl(event.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950" placeholder="https://exemplo.com/foto.jpg" />
          </Field>
        </div>

        <div className="space-y-3 rounded-2xl border border-blue-200 bg-white p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-slate-950">Itens que compõem o kit</h3>
              <button
                type="button"
              onClick={() => {
                setComponents((current) => [...current, { componentId: "", variationId: "", quantity: "1" }]);
                setPickingComponentIndex(components.length);
              }}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Adicionar item
            </button>
          </div>

          {products.length === 0 ? (
            <p className="text-sm text-slate-500">Cadastre pelo menos um produto antes de criar um kit.</p>
          ) : (
            components.map((component, index) => {
              const selectedProduct = products.find((product) => product.id === Number(component.componentId));

              return (
              <div key={index} className="grid gap-3 md:grid-cols-[1fr_180px_140px_auto]">
                <button
                  type="button"
                  onClick={() => setPickingComponentIndex(index)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-sm outline-none hover:bg-slate-100 focus:border-slate-950"
                >
                  {selectedProduct ? (
                    <span>
                      <strong className="text-slate-950">{selectedProduct.sku}</strong> - {selectedProduct.name}
                      {selectedProduct.isKit ? " (kit)" : ""}
                    </span>
                  ) : (
                    <span className="text-slate-500">Escolher produto ou kit</span>
                  )}
                </button>
                <select
                  value={component.variationId}
                  onChange={(event) =>
                    setComponents((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, variationId: event.target.value } : item)))
                  }
                  disabled={!selectedProduct || selectedProduct.variations.length === 0}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950 disabled:bg-slate-100"
                >
                  <option value="">Sem variação</option>
                  {selectedProduct?.variations.map((variation) => (
                    <option key={variation.id} value={variation.id}>
                      {variation.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={component.quantity}
                  onChange={(event) =>
                    setComponents((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, quantity: event.target.value } : item)))
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
                  placeholder="Qtd."
                />
                <button
                  type="button"
                  onClick={() => setComponents((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                  disabled={components.length === 1}
                  className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Remover
                </button>
              </div>
              );
            })
          )}
          {pickingComponentIndex !== null ? (
            <ProductPickerModal
              title="Escolher item do kit"
              products={products}
              onClose={() => setPickingComponentIndex(null)}
              onSelect={(selectedProduct) => {
                setComponents((current) =>
                  current.map((item, index) =>
                    index === pickingComponentIndex ? { ...item, componentId: selectedProduct.id.toString(), variationId: "" } : item
                  )
                );
                setPickingComponentIndex(null);
              }}
            />
          ) : null}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          {state.message ? (
            <p className={`text-sm font-medium ${state.ok ? "text-emerald-700" : "text-red-700"}`}>{state.message}</p>
          ) : null}
          <button
            type="submit"
            disabled={pending || products.length === 0}
            className="rounded-lg bg-blue-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Salvando..." : "Salvar kit"}
          </button>
        </div>
      </form>
    </section>
  );
}

function ProductForm({ product, onSaved }: { product: ProductRow | null; onSaved: () => void }) {
  const action = product ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState(action, initialActionState);
  const [sku, setSku] = useState(product?.sku ?? "");
  const [name, setName] = useState(product?.name ?? "");
  const [quantity, setQuantity] = useState(product?.quantity.toString() ?? "");
  const [soldQuantity, setSoldQuantity] = useState(product?.soldQuantity.toString() ?? "0");
  const [manufacturingValue, setManufacturingValue] = useState(product ? toMoneyInput(product.manufacturingValue) : "");
  const [saleValue, setSaleValue] = useState(product ? toMoneyInput(product.saleValue) : "");
  const [photoUrl, setPhotoUrl] = useState(product?.photoUrl ?? "");

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
              value={sku}
              onChange={(event) => setSku(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="Ex.: VASO-RECIFE-001"
            />
          </Field>
          <Field label="Nome" error={state.errors?.name?.[0]}>
            <input
              name="name"
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
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
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="10"
            />
          </Field>
          <Field label="Quantidade vendida" error={state.errors?.soldQuantity?.[0]}>
            <input
              name="soldQuantity"
              required
              type="number"
              min="0"
              step="1"
              value={soldQuantity}
              onChange={(event) => setSoldQuantity(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="0"
            />
          </Field>
          <Field label="Valor de fabricação" error={state.errors?.manufacturingValue?.[0]}>
            <input
              name="manufacturingValue"
              required
              inputMode="decimal"
              value={manufacturingValue}
              onChange={(event) => setManufacturingValue(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="15,00"
            />
          </Field>
          <Field label="Valor de venda" error={state.errors?.saleValue?.[0]}>
            <input
              name="saleValue"
              required
              inputMode="decimal"
              value={saleValue}
              onChange={(event) => setSaleValue(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-slate-950"
              placeholder="28,90"
            />
          </Field>
          <Field label="URL da foto (opcional)" error={state.errors?.photoUrl?.[0]}>
            <input
              name="photoUrl"
              type="url"
              value={photoUrl}
              onChange={(event) => setPhotoUrl(event.target.value)}
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

function calculateDiscount(grossValue: number, discountType: string, discountValue?: number, manualFinalValue?: number) {
  if (typeof manualFinalValue === "number") {
    return roundMoney(Math.max(grossValue - manualFinalValue, 0));
  }

  if (discountType === "FIXED" && typeof discountValue === "number") {
    return roundMoney(Math.min(Math.max(discountValue, 0), grossValue));
  }

  if (discountType === "PERCENT" && typeof discountValue === "number") {
    const cappedPercent = Math.min(Math.max(discountValue, 0), 100);
    return roundMoney(grossValue * (cappedPercent / 100));
  }

  return 0;
}

function toValidSelectionItems(items: ProductSelectionDraft[]) {
  return items
    .filter((item) => item.productId && Number(item.quantity) > 0)
    .map((item) => ({ productId: Number(item.productId), variationId: item.variationId ? Number(item.variationId) : null, quantity: Number(item.quantity) }));
}

function calculateSelectionManufacturingCost(
  items: Array<{ productId: number; variationId: number | null; quantity: number }>,
  products: ProductRow[]
) {
  return roundMoney(
    items.reduce((total, item) => {
      const selectedProduct = products.find((currentProduct) => currentProduct.id === item.productId);
      const selectedVariation = selectedProduct?.variations.find((variation) => variation.id === item.variationId);

      return total + (selectedProduct ? Number(selectedVariation?.manufacturingValue ?? selectedProduct.manufacturingValue) * item.quantity : 0);
    }, 0)
  );
}

function parseMoney(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const parsed = Number(normalized);

  return Number.isNaN(parsed) ? undefined : parsed;
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

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}
