"use server";

import { Prisma } from "@prisma/client";
import { randomUUID } from "crypto";
import { copyFile, mkdir, unlink, writeFile } from "fs/promises";
import { revalidatePath } from "next/cache";
import path from "path";
import { prisma } from "@/lib/prisma";
import { calculateShopeeFee, roundMoney } from "@/lib/shopee";
import { parseKitComponents, parseOptionalSaleItems, parseProductFormData, parseProductVariationFormData, parseSaleItems, parseSellProductFormData } from "@/lib/validation";
import type { ActionState } from "@/types/transaction";

const PRODUCT_UPLOAD_URL_PREFIX = "/uploads/products";
const PRODUCT_UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "products");
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function createProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProductFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  const savedImage = await saveProductImage(formData);

  if (!savedImage.ok) {
    return savedImage.state;
  }

  try {
    await prisma.product.create({
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        isKit: false,
        quantity: parsed.data.quantity,
        minimumStock: parsed.data.minimumStock,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
        photoUrl: savedImage.path,
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Produto cadastrado com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      await deleteProductImageIfUnused(savedImage.path);
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    await deleteProductImageIfUnused(savedImage.path);
    return { ok: false, message: "Não foi possível cadastrar o produto." };
  }
}

export async function updateProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = parseProductFormData(formData);

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Produto inválido." };
  }

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  const savedImage = await saveProductImage(formData);

  if (!savedImage.ok) {
    return savedImage.state;
  }

  try {
    const [productWithSku, currentProduct] = await Promise.all([
      prisma.product.findUnique({
        where: { sku: parsed.data.sku },
        select: { id: true },
      }),
      prisma.product.findUnique({ where: { id }, select: { photoUrl: true } }),
    ]);

    if (!currentProduct) {
      await deleteProductImageIfUnused(savedImage.path);
      return { ok: false, message: "Produto não encontrado." };
    }

    if (productWithSku && productWithSku.id !== id) {
      await deleteProductImageIfUnused(savedImage.path);
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    await prisma.product.update({
      where: { id },
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        quantity: parsed.data.quantity,
        minimumStock: parsed.data.minimumStock,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
        photoUrl: savedImage.path || currentProduct.photoUrl,
      },
    });

    if (savedImage.path) {
      await deleteProductImageIfUnused(currentProduct.photoUrl);
    }

    revalidatePath("/stock");
    return { ok: true, message: "Produto atualizado com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      await deleteProductImageIfUnused(savedImage.path);
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    await deleteProductImageIfUnused(savedImage.path);
    return { ok: false, message: "Não foi possível atualizar o produto." };
  }
}

export async function createKit(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProductFormData(formData);
  const parsedComponents = parseKitComponents(formData.get("components"));

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  if (!parsedComponents.success) {
    return { ok: false, message: parsedComponents.message };
  }

  const components = mergeComponents(parsedComponents.data);
  const savedImage = await saveProductImage(formData);

  if (!savedImage.ok) {
    return savedImage.state;
  }

  try {
    const componentProductIds = Array.from(new Set(components.map((component) => component.componentId)));
    const componentVariationIds = components
      .map((component) => component.variationId)
      .filter((variationId): variationId is number => variationId !== null);
    const [componentCount, componentVariations] = await Promise.all([
      prisma.product.count({ where: { id: { in: componentProductIds } } }),
      prisma.productVariation.findMany({
        where: { id: { in: componentVariationIds } },
        select: { id: true, productId: true },
      }),
    ]);

    if (componentCount !== componentProductIds.length) {
      return { ok: false, message: "Um ou mais itens do kit não foram encontrados." };
    }

    const invalidVariation = components.some((component) => {
      if (!component.variationId) {
        return false;
      }

      return !componentVariations.some((variation) => variation.id === component.variationId && variation.productId === component.componentId);
    });

    if (invalidVariation) {
      return { ok: false, message: "Uma ou mais variações do kit não pertencem ao item selecionado." };
    }

    await prisma.product.create({
      data: {
        sku: parsed.data.sku,
        name: parsed.data.name,
        isKit: true,
        quantity: parsed.data.quantity,
        minimumStock: parsed.data.minimumStock,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
        photoUrl: savedImage.path,
        kitComponents: {
          create: components,
        },
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Kit cadastrado com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      await deleteProductImageIfUnused(savedImage.path);
      return { ok: false, message: "Já existe um produto com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    await deleteProductImageIfUnused(savedImage.path);
    return { ok: false, message: "Não foi possível cadastrar o kit." };
  }
}

export async function createVariation(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseProductVariationFormData(formData);

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.productVariation.create({
      data: {
        productId: parsed.data.productId,
        sku: parsed.data.sku || null,
        name: parsed.data.name,
        variationType: parsed.data.variationType,
        variationValue: parsed.data.variationValue,
        quantity: parsed.data.quantity,
        minimumStock: parsed.data.minimumStock,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Variação cadastrada com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      return { ok: false, message: "Já existe uma variação com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    return { ok: false, message: "Não foi possível cadastrar a variação." };
  }
}

export async function updateVariation(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));
  const parsed = parseProductVariationFormData(formData);

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Variação inválida." };
  }

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  try {
    await prisma.productVariation.update({
      where: { id },
      data: {
        productId: parsed.data.productId,
        sku: parsed.data.sku || null,
        name: parsed.data.name,
        variationType: parsed.data.variationType,
        variationValue: parsed.data.variationValue,
        quantity: parsed.data.quantity,
        minimumStock: parsed.data.minimumStock,
        soldQuantity: parsed.data.soldQuantity,
        manufacturingValue: new Prisma.Decimal(parsed.data.manufacturingValue),
        saleValue: new Prisma.Decimal(parsed.data.saleValue),
      },
    });

    revalidatePath("/stock");
    return { ok: true, message: "Variação atualizada com sucesso." };
  } catch (error) {
    if (isDuplicateSkuError(error)) {
      return { ok: false, message: "Já existe uma variação com este SKU.", errors: { sku: ["Este SKU já está em uso."] } };
    }

    return { ok: false, message: "Não foi possível atualizar a variação." };
  }
}

export async function deleteProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Produto inválido." };
  }

  try {
    const product = await prisma.product.findUnique({ where: { id }, select: { photoUrl: true } });

    if (!product) {
      return { ok: false, message: "Produto não encontrado." };
    }

    await prisma.product.delete({ where: { id } });
    await deleteProductImageIfUnused(product.photoUrl);
    revalidatePath("/stock");
    return { ok: true, message: "Produto excluído com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível excluir o produto." };
  }
}

export async function duplicateProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const id = Number(formData.get("id"));

  if (!Number.isInteger(id) || id <= 0) {
    return { ok: false, message: "Produto inválido." };
  }

  try {
    const product = await prisma.product.findUnique({
      where: { id },
      include: { kitComponents: true },
    });

    if (!product) {
      return { ok: false, message: "Produto não encontrado." };
    }

    const copiedImagePath = await copyProductImage(product.photoUrl);

    try {
      await prisma.product.create({
      data: {
        sku: await createDuplicateSku(product.sku),
        name: `${product.name} (cópia)`,
        isKit: product.isKit,
        quantity: product.quantity,
        minimumStock: product.minimumStock,
        soldQuantity: product.soldQuantity,
        manufacturingValue: product.manufacturingValue,
        saleValue: product.saleValue,
        photoUrl: copiedImagePath || product.photoUrl,
        kitComponents: {
          create: product.kitComponents.map((component) => ({
            componentId: component.componentId,
            variationId: component.variationId,
            quantity: component.quantity,
          })),
        },
      },
    });
    } catch (error) {
      await deleteProductImageIfUnused(copiedImagePath);
      throw error;
    }

    revalidatePath("/stock");
    return { ok: true, message: "Produto duplicado com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível duplicar o produto." };
  }
}

export async function sellProduct(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseSellProductFormData(formData);
  const parsedItems = parseSaleItems(formData.get("items"));
  const parsedGiftItems = parseOptionalSaleItems(formData.get("giftItems"));

  if (!parsed.success) {
    return { ok: false, message: "Corrija os campos destacados.", errors: parsed.error.flatten().fieldErrors };
  }

  if (!parsedItems.success) {
    return { ok: false, message: parsedItems.message };
  }

  if (!parsedGiftItems.success) {
    return { ok: false, message: parsedGiftItems.message };
  }

  try {
    const [allProducts, allComponents] = await Promise.all([
      prisma.product.findMany({
        select: {
          id: true,
          quantity: true,
          name: true,
          saleValue: true,
          variations: { select: { id: true, productId: true, quantity: true, name: true, variationType: true, variationValue: true, saleValue: true } },
        },
      }),
      prisma.productComponent.findMany({ select: { kitId: true, componentId: true, variationId: true, quantity: true } }),
    ]);
    const saleItems = mergeSaleItems(parsedItems.data);
    const giftItems = mergeSaleItems(parsedGiftItems.data);
    const stockItems = mergeSaleItems([...saleItems, ...giftItems]);
    const selectedProducts = saleItems.map((item) => {
      const product = allProducts.find((currentProduct) => currentProduct.id === item.productId);

      if (!product) {
        throw new Error("Produto não encontrado.");
      }

      const variation = item.variationId ? product.variations.find((currentVariation) => currentVariation.id === item.variationId) : null;

      if (item.variationId && !variation) {
        throw new Error("Variação não encontrada.");
      }

      return { ...product, selectedVariation: variation, saleQuantity: item.quantity };
    });
    validateSaleItems(giftItems, allProducts);
    const requiredQuantities = new Map<string, { productId: number; variationId: number | null; quantity: number }>();

    for (const item of stockItems) {
      const itemRequiredQuantities = calculateRequiredQuantities(item.productId, item.variationId ?? null, item.quantity, allComponents);

      for (const movement of itemRequiredQuantities.values()) {
        addRequiredMovement(requiredQuantities, movement.productId, movement.variationId, movement.quantity);
      }
    }
    const unavailableProduct = findUnavailableStock(requiredQuantities, allProducts);

    if (unavailableProduct) {
      return {
        ok: false,
        message: `Estoque insuficiente para ${unavailableProduct.name}.`,
        errors: { quantity: ["Quantidade maior que o estoque disponível."] },
      };
    }

    const soldQuantity = selectedProducts.reduce((total, product) => total + product.saleQuantity, 0);
    const grossValue = roundMoney(
      selectedProducts.reduce((total, product) => total + Number(product.selectedVariation?.saleValue ?? product.saleValue) * product.saleQuantity, 0)
    );
    const saleValueBeforeFee = calculateSaleValueBeforeFee(grossValue, parsed.data.discountType, parsed.data.discountValue, parsed.data.finalValue);
    const discountValue = roundMoney(Math.max(grossValue - saleValueBeforeFee, 0));
    const unitValueBeforeFee = roundMoney(saleValueBeforeFee / soldQuantity);
    const platformFeeValue = parsed.data.platform === "SHOPEE" ? calculateShopeeFee(unitValueBeforeFee, soldQuantity) : 0;
    const totalValue = roundMoney(Math.max(saleValueBeforeFee - platformFeeValue, 0));
    const saleName = selectedProducts
      .map((product) => `${product.saleQuantity}x ${product.name}${product.selectedVariation ? ` - ${formatVariationLabel(product.selectedVariation)}` : ""}`)
      .join(" + ");

    await prisma.$transaction([
      prisma.sale.create({
        data: {
          name: saleName,
          unitValue: new Prisma.Decimal(roundMoney(totalValue / soldQuantity)),
          quantity: soldQuantity,
          grossValue: new Prisma.Decimal(grossValue),
          discountValue: new Prisma.Decimal(discountValue),
          platformFeeValue: new Prisma.Decimal(platformFeeValue),
          totalValue: new Prisma.Decimal(totalValue),
          platform: parsed.data.platform,
          date: new Date(`${parsed.data.date}T00:00:00.000Z`),
          stockMovements: {
            create: Array.from(requiredQuantities.values()).map((movement) => ({
              productId: movement.productId,
              variationId: movement.variationId,
              quantity: movement.quantity,
            })),
          },
        },
      }),
      ...Array.from(requiredQuantities.values()).map((movement) =>
        movement.variationId
          ? prisma.productVariation.update({
              where: { id: movement.variationId },
              data: { quantity: { decrement: movement.quantity }, soldQuantity: { increment: movement.quantity } },
            })
          : prisma.product.update({
              where: { id: movement.productId },
              data: { quantity: { decrement: movement.quantity }, soldQuantity: { increment: movement.quantity } },
            })
      ),
    ]);

    revalidatePath("/");
    revalidatePath("/sales");
    revalidatePath("/stock");
    return { ok: true, message: "Venda lançada com sucesso." };
  } catch {
    return { ok: false, message: "Não foi possível lançar a venda." };
  }
}

function validateSaleItems(
  items: Array<{ productId: number; variationId: number | null; quantity: number }>,
  products: Array<{ id: number; variations: Array<{ id: number }> }>
) {
  for (const item of items) {
    const product = products.find((currentProduct) => currentProduct.id === item.productId);

    if (!product) {
      throw new Error("Produto não encontrado.");
    }

    if (item.variationId && !product.variations.some((variation) => variation.id === item.variationId)) {
      throw new Error("Variação não encontrada.");
    }
  }
}

function isDuplicateSkuError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

async function createDuplicateSku(sku: string) {
  const baseSku = `${sku.slice(0, 85)}-COPIA`;
  let candidate = baseSku;
  let suffix = 2;

  while (await prisma.product.findUnique({ where: { sku: candidate } })) {
    candidate = `${baseSku}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

async function saveProductImage(formData: FormData): Promise<{ ok: true; path: string } | { ok: false; state: ActionState }> {
  const image = formData.get("photo");

  if (!(image instanceof File) || image.size === 0) {
    return { ok: true, path: "" };
  }

  if (!image.type.startsWith("image/")) {
    return { ok: false, state: { ok: false, message: "Envie um arquivo de imagem válido.", errors: { photo: ["O arquivo precisa ser uma imagem."] } } };
  }

  if (image.size > MAX_IMAGE_SIZE) {
    return { ok: false, state: { ok: false, message: "A imagem deve ter no máximo 5 MB.", errors: { photo: ["A imagem deve ter no máximo 5 MB."] } } };
  }

  const extension = imageExtension(image);
  const filename = `${randomUUID()}${extension}`;

  await mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(PRODUCT_UPLOAD_DIR, filename), Buffer.from(await image.arrayBuffer()));

  return { ok: true, path: `${PRODUCT_UPLOAD_URL_PREFIX}/${filename}` };
}

async function copyProductImage(photoUrl: string) {
  const sourcePath = productImagePath(photoUrl);

  if (!sourcePath) {
    return "";
  }

  const extension = path.extname(sourcePath) || ".webp";
  const filename = `${randomUUID()}${extension}`;

  await mkdir(PRODUCT_UPLOAD_DIR, { recursive: true });
  await copyFile(sourcePath, path.join(PRODUCT_UPLOAD_DIR, filename));

  return `${PRODUCT_UPLOAD_URL_PREFIX}/${filename}`;
}

async function deleteProductImageIfUnused(photoUrl: string) {
  const imagePath = productImagePath(photoUrl);

  if (!imagePath) {
    return;
  }

  const references = await prisma.product.count({ where: { photoUrl } });

  if (references > 0) {
    return;
  }

  try {
    await unlink(imagePath);
  } catch (error) {
    if (!isMissingFileError(error)) {
      throw error;
    }
  }
}

function productImagePath(photoUrl: string) {
  if (!photoUrl.startsWith(`${PRODUCT_UPLOAD_URL_PREFIX}/`)) {
    return null;
  }

  return path.join(PRODUCT_UPLOAD_DIR, path.basename(photoUrl));
}

function imageExtension(image: File) {
  const extension = path.extname(image.name).toLowerCase();

  if (/^\.(avif|gif|jpe?g|png|webp|svg)$/.test(extension)) {
    return extension;
  }

  if (image.type === "image/jpeg") {
    return ".jpg";
  }

  const subtype = image.type.split("/")[1];

  return subtype ? `.${subtype.replace(/[^a-z0-9]/gi, "").toLowerCase()}` : ".webp";
}

function isMissingFileError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function mergeComponents(components: Array<{ componentId: number; variationId?: number | null; quantity: number }>) {
  const grouped = new Map<string, { componentId: number; variationId: number | null; quantity: number }>();

  for (const component of components) {
    const key = movementKey(component.componentId, component.variationId ?? null);
    const current = grouped.get(key);

    grouped.set(key, {
      componentId: component.componentId,
      variationId: component.variationId ?? null,
      quantity: (current?.quantity ?? 0) + component.quantity,
    });
  }

  return Array.from(grouped.values());
}

function mergeSaleItems(items: Array<{ productId: number; variationId?: number | null; quantity: number }>) {
  const grouped = new Map<string, { productId: number; variationId: number | null; quantity: number }>();

  for (const item of items) {
    const key = movementKey(item.productId, item.variationId ?? null);
    const current = grouped.get(key);

    grouped.set(key, {
      productId: item.productId,
      variationId: item.variationId ?? null,
      quantity: (current?.quantity ?? 0) + item.quantity,
    });
  }

  return Array.from(grouped.values());
}

function calculateRequiredQuantities(
  productId: number,
  variationId: number | null,
  quantity: number,
  components: Array<{ kitId: number; componentId: number; variationId: number | null; quantity: number }>
) {
  const required = new Map<string, { productId: number; variationId: number | null; quantity: number }>();
  const componentsByKit = new Map<number, Array<{ componentId: number; variationId: number | null; quantity: number }>>();

  for (const component of components) {
    const kitComponents = componentsByKit.get(component.kitId) ?? [];
    kitComponents.push({ componentId: component.componentId, variationId: component.variationId, quantity: component.quantity });
    componentsByKit.set(component.kitId, kitComponents);
  }

  addRequiredProduct(productId, variationId, quantity, componentsByKit, required, new Set<number>());

  return required;
}

function addRequiredProduct(
  productId: number,
  variationId: number | null,
  quantity: number,
  componentsByKit: Map<number, Array<{ componentId: number; variationId: number | null; quantity: number }>>,
  required: Map<string, { productId: number; variationId: number | null; quantity: number }>,
  visiting: Set<number>
) {
  if (visiting.has(productId)) {
    throw new Error("Composição circular de kit.");
  }

  addRequiredMovement(required, productId, variationId, quantity);

  const components = componentsByKit.get(productId) ?? [];

  if (components.length === 0) {
    return;
  }

  visiting.add(productId);

  for (const component of components) {
    addRequiredProduct(component.componentId, component.variationId, quantity * component.quantity, componentsByKit, required, visiting);
  }

  visiting.delete(productId);
}

function addRequiredMovement(
  required: Map<string, { productId: number; variationId: number | null; quantity: number }>,
  productId: number,
  variationId: number | null,
  quantity: number
) {
  const key = movementKey(productId, variationId);
  const current = required.get(key);

  required.set(key, {
    productId,
    variationId,
    quantity: (current?.quantity ?? 0) + quantity,
  });
}

function findUnavailableStock(
  required: Map<string, { productId: number; variationId: number | null; quantity: number }>,
  products: Array<{
    id: number;
    name: string;
    quantity: number;
    variations: Array<{ id: number; name: string; variationType: string; variationValue: string; quantity: number }>;
  }>
) {
  for (const movement of required.values()) {
    const product = products.find((item) => item.id === movement.productId);
    const stockQuantity = movement.variationId ? product?.variations.find((variation) => variation.id === movement.variationId)?.quantity : product?.quantity;

    if ((stockQuantity ?? 0) < movement.quantity) {
      const variation = movement.variationId ? product?.variations.find((item) => item.id === movement.variationId) : null;

      return { name: variation ? `${product?.name} - ${formatVariationLabel(variation)}` : product?.name ?? "produto" };
    }
  }

  return null;
}

function formatVariationLabel(variation: { name: string; variationType: string; variationValue: string }) {
  const typeValue = [variation.variationType, variation.variationValue].filter(Boolean).join(": ");

  return typeValue ? `${variation.name} (${typeValue})` : variation.name;
}

function movementKey(productId: number, variationId: number | null) {
  return `${productId}:${variationId ?? ""}`;
}

function calculateSaleValueBeforeFee(
  grossValue: number,
  discountType: "NONE" | "FIXED" | "PERCENT",
  discountValue?: number | "",
  finalValue?: number | ""
) {
  if (typeof finalValue === "number") {
    return roundMoney(Math.max(finalValue, 0));
  }

  if (discountType === "FIXED" && typeof discountValue === "number") {
    return roundMoney(Math.max(grossValue - discountValue, 0));
  }

  if (discountType === "PERCENT" && typeof discountValue === "number") {
    const cappedPercent = Math.min(Math.max(discountValue, 0), 100);
    return roundMoney(Math.max(grossValue - grossValue * (cappedPercent / 100), 0));
  }

  return grossValue;
}
