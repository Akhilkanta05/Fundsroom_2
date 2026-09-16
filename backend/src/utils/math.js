/**
 * Precision calculation helper for Quotation items and totals
 * As required by the case study:
 * Base Amount = Quantity * Unit Price
 * Apply discount and GST to calculate final line amount.
 * Final quotation amount must be calculated/validated by the backend.
 */

function calculateQuotationItem(item) {
  const quantity = Number(item.quantity);
  const unitPrice = Number(item.unit_price !== undefined ? item.unit_price : item.unitPrice);
  const discountPercent = Number(item.discount_percent !== undefined ? item.discount_percent : (item.discountPercent || 0));
  const gstPercent = Number(item.gst_percent !== undefined ? item.gst_percent : (item.gstPercent !== undefined ? item.gstPercent : 18));

  if (isNaN(quantity) || quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  if (isNaN(unitPrice) || unitPrice < 0) {
    throw new Error('Unit price must be non-negative');
  }
  if (isNaN(discountPercent) || discountPercent < 0 || discountPercent > 100) {
    throw new Error('Discount percentage must be between 0 and 100');
  }
  if (isNaN(gstPercent) || gstPercent < 0 || gstPercent > 100) {
    throw new Error('GST percentage must be between 0 and 100');
  }

  const baseAmount = quantity * unitPrice;
  const discountAmount = baseAmount * (discountPercent / 100);
  const discountedBase = baseAmount - discountAmount;
  const gstAmount = discountedBase * (gstPercent / 100);
  const lineAmount = Number((discountedBase + gstAmount).toFixed(2));

  return {
    product_id: item.product_id || item.productId,
    quantity,
    unit_price: Number(unitPrice.toFixed(2)),
    discount_percent: Number(discountPercent.toFixed(2)),
    gst_percent: Number(gstPercent.toFixed(2)),
    base_amount: Number(baseAmount.toFixed(2)),
    discount_amount: Number(discountAmount.toFixed(2)),
    gst_amount: Number(gstAmount.toFixed(2)),
    line_amount: lineAmount,
  };
}

function calculateQuotationTotals(items) {
  if (!items || !Array.isArray(items) || items.length === 0) {
    throw new Error('Quotation must contain at least one item');
  }

  const calculatedItems = items.map(calculateQuotationItem);
  const grandTotal = Number(
    calculatedItems.reduce((acc, curr) => acc + curr.line_amount, 0).toFixed(2)
  );

  return {
    items: calculatedItems,
    grandTotal,
  };
}

module.exports = {
  calculateQuotationItem,
  calculateQuotationTotals,
};
