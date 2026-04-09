import { IProduct } from "../../models/Product";

/**
 * Pick price information for a product given a type/label.
 * Priority:
 * 1. variant (match by label case-insensitive)
 * 2. product.prices[type] (e.g. prices.hybrid)
 * 3. product.hybridBreakdown[type]
 * 4. product.discountPrice / product.price (product level)
 */
export function pickPriceForProduct(product: any, typeOrLabel?: string | null) {
  const norm = typeOrLabel ? String(typeOrLabel).trim().toLowerCase() : null;

  // 1) Variant match (case-insensitive)
  if (product.variants?.length) {
    const found =
      product.variants.find(
        (v: any) => v.label && norm && v.label.trim().toLowerCase() === norm
      ) || null;
    if (found) {
      return {
        unitPrice: Number(found.price ?? 0),
        discountPrice: Number(found.discountPrice ?? 0),
        source: "variant",
        label: found.label,
      };
    }
  }

  // 2) product.prices[type] (e.g. prices.hybrid)
  if (product.prices && norm && product.prices[norm]) {
    const p = product.prices[norm];
    return {
      unitPrice: Number(p.price ?? 0),
      discountPrice: Number(p.discountPrice ?? p.price ?? 0),
      source: `prices.${norm}`,
      label: norm,
    };
  }

  // 3) hybridBreakdown
  if (product.hybridBreakdown && norm && product.hybridBreakdown[norm] != null) {
    return {
      unitPrice: Number(product.hybridBreakdown[norm] ?? 0),
      discountPrice: Number(product.discountPrice ?? 0),
      source: "hybridBreakdown",
      label: norm,
    };
  }

  // 4) fallback to product-level
  return {
    unitPrice: Number(product.price ?? 0),
    discountPrice: Number(product.discountPrice ?? product.price ?? 0),
    source: "product-level",
    label: null,
  };
}

/** Build a single order item doc from a raw item + resolved product */
export function buildOrderItem(product: IProduct & any, item: any) {
  const rawLabel = item.unitLabel ?? null;
  const lookupLabel = rawLabel ? String(rawLabel).trim().toLowerCase() : null;
  const priceInfo = pickPriceForProduct(product, lookupLabel);
  const applyDiscount = !!item.applyDiscount;

  const effectivePrice =
    applyDiscount && priceInfo.discountPrice && priceInfo.discountPrice > 0
      ? priceInfo.discountPrice
      : priceInfo.unitPrice;

  const qty = Number(item.qty || 0);
  const lineTotal = Number((effectivePrice * qty).toFixed(2));

  return {
    product: product._id,
    name: product.itemName || product.subProductLine || product.productLine,
    productLine: product.productLine,
    subProductLine: product.subProductLine,
    sku: product.metadata?.sku || "",
    unitLabel: rawLabel ?? priceInfo.label ?? null,
    unitPrice: Number(priceInfo.unitPrice ?? 0),
    discountPrice: Number(priceInfo.discountPrice ?? 0),
    appliedDiscount: applyDiscount,
    qty,
    lineTotal,
  };
}

/** Calculate discount amount from subtotal */
export function calcDiscount(subtotal: number, discountType: string, discountValue: number) {
  let amount = 0;
  if (discountType === "percent") {
    amount = (subtotal * discountValue) / 100;
  } else {
    amount = discountValue;
  }
  return Math.max(0, Number(amount.toFixed(2)));
}
