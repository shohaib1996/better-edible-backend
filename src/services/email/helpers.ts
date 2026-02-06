// src/services/email/helpers.ts

export const formatItemsList = (
  items: Array<{ flavorName: string; productType: string; quantity: number }>
): string => {
  return items
    .map(
      (item) =>
        `• ${item.flavorName} ${item.productType} - ${item.quantity} units`
    )
    .join("\n");
};

export const formatShippingAddressBlock = (shippingAddress?: {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}): string => {
  if (!shippingAddress) return "";

  return `
    <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong>Shipping To:</strong><br>
      ${shippingAddress.name}<br>
      ${shippingAddress.address}<br>
      ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}
    </div>
  `;
};

export const formatTrackingBlock = (trackingNumber?: string): string => {
  if (!trackingNumber) return "";

  return `
    <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
      <strong>Tracking Number:</strong> ${trackingNumber}
    </div>
  `;
};
