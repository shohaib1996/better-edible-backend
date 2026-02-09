// src/services/email/helpers.ts

// Brand Colors
export const BRAND_COLORS = {
  primary: "#f77f00", // Orange
  primaryDark: "#e06f00",
  secondary: "#fcbf49", // Golden Yellow
  accent: "#d62828", // Red
  foreground: "#003049", // Dark Blue
  background: "#eae2b7", // Cream
  muted: "#f5edd1",
  mutedForeground: "#6d6052",
  border: "#ddd4bd",
  card: "#ffffff",
};

export const LOGO_URL =
  "https://res.cloudinary.com/dsn66l0iv/image/upload/v1766512506/Better_Edibles_logo_tqs1pm.png";

export const labelImageBlock = (
  imageUrl: string,
  flavorName: string,
  showViewLink: boolean = true
): string => {
  const viewLinkHtml = showViewLink
    ? `
      <tr>
        <td align="center" style="padding-top: 12px;">
          <a href="${imageUrl}" target="_blank" style="font-size: 13px; color: ${BRAND_COLORS.primary}; text-decoration: none;">
            🔗 Click here to view label image
          </a>
        </td>
      </tr>
    `
    : "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
      <tr>
        <td align="center">
          <table role="presentation" cellspacing="0" cellpadding="20" style="background-color: ${BRAND_COLORS.muted}; border-radius: 2px; border: 1px solid ${BRAND_COLORS.border};">
            <tr>
              <td align="center">
                <a href="${imageUrl}" target="_blank" style="text-decoration: none;">
                  <img
                    src="${imageUrl}"
                    alt="${flavorName} Label - Click to view"
                    width="300"
                    height="280"
                    border="0"
                    style="max-width: 100%; height: auto; border: 0; outline: none; display: block;"
                  />
                </a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      ${viewLinkHtml}
    </table>
  `;
};

export const emailWrapper = (content: string): string => {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta name="color-scheme" content="light dark">
      <meta name="supported-color-schemes" content="light dark">
      <title>Better Edibles</title>
      <!--[if mso]>
      <style type="text/css">
        table { border-collapse: collapse; }
        .fallback-font { font-family: Arial, sans-serif !important; }
      </style>
      <![endif]-->
    </head>
    <body style="margin: 0; padding: 0; background-color: ${BRAND_COLORS.background}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLORS.background};">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; width: 100%;">
              <!-- Logo Header -->
              <tr>
                <td align="center" style="padding-bottom: 30px;">
                  <table role="presentation" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <a href="https://www.better-edibles.com/" target="_blank" style="text-decoration: none;">
                          <img src="${LOGO_URL}" alt="Better Edibles" width="180" height="60" border="0" style="display: block; max-width: 180px; height: auto; border: 0; outline: none;" />
                        </a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding-top: 8px;">
                        <a href="https://www.better-edibles.com/" target="_blank" style="font-size: 22px; font-weight: 700; color: ${BRAND_COLORS.primary}; text-decoration: none; letter-spacing: -0.5px;">
                          Better Edibles
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <!-- Main Content Card -->
              <tr>
                <td style="background-color: ${BRAND_COLORS.card}; border-radius: 2px; border: 1px solid ${BRAND_COLORS.border}; overflow: hidden;">
                  ${content}
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td align="center" style="padding: 30px 20px;">
                  <p style="margin: 0 0 10px; font-size: 14px; color: ${BRAND_COLORS.mutedForeground};">
                    © ${new Date().getFullYear()} Better Edibles. All rights reserved.
                  </p>
                  <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.mutedForeground};">
                    This email was sent by Better Edibles Private Label System
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

export const headerBanner = (
  emoji: string,
  title: string,
  color: string = BRAND_COLORS.primary
): string => {
  return `
    <td style="background: linear-gradient(135deg, ${color} 0%, ${adjustColor(color, -20)} 100%); padding: 35px 40px; text-align: center;">
      <div style="font-size: 48px; margin-bottom: 10px;">${emoji}</div>
      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">
        ${title}
      </h1>
    </td>
  `;
};

export const adjustColor = (hex: string, percent: number): string => {
  const num = parseInt(hex.replace("#", ""), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return `#${((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1)}`;
};

export const formatItemsTable = (
  items: Array<{ flavorName: string; productType: string; quantity: number }>
): string => {
  const rows = items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid ${BRAND_COLORS.border};">
        <td style="padding: 14px 16px; font-size: 14px; color: ${BRAND_COLORS.mutedForeground};">
          <strong style="color: ${BRAND_COLORS.foreground};">${item.flavorName}</strong>
          <div style="font-size: 12px; color: ${BRAND_COLORS.mutedForeground}; margin-top: 2px;">${item.productType}</div>
        </td>
        <td style="padding: 14px 16px; font-size: 14px; color: ${BRAND_COLORS.foreground}; text-align: center; font-weight: 600;">
          ${item.quantity}
        </td>
      </tr>
    `
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border: 1px solid ${BRAND_COLORS.border}; border-radius: 2px; overflow: hidden; margin: 20px 0;">
      <thead>
        <tr style="background-color: ${BRAND_COLORS.muted};">
          <th style="padding: 14px 16px; font-size: 12px; font-weight: 600; color: ${BRAND_COLORS.mutedForeground}; text-align: left; text-transform: uppercase; letter-spacing: 0.5px;">
            Product
          </th>
          <th style="padding: 14px 16px; font-size: 12px; font-weight: 600; color: ${BRAND_COLORS.mutedForeground}; text-align: center; text-transform: uppercase; letter-spacing: 0.5px;">
            Qty
          </th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  `;
};

export const infoCard = (
  items: Array<{ label: string; value: string }>,
  accentColor: string = BRAND_COLORS.primary
): string => {
  const rows = items
    .map(
      (item) => `
      <tr>
        <td style="padding: 8px 0; font-size: 13px; color: ${BRAND_COLORS.mutedForeground}; width: 140px;">${item.label}</td>
        <td style="padding: 8px 0; font-size: 14px; color: ${BRAND_COLORS.foreground}; font-weight: 600;">${item.value}</td>
      </tr>
    `
    )
    .join("");

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLORS.muted}; border-radius: 2px; border-left: 4px solid ${accentColor}; margin: 20px 0;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            ${rows}
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const shippingAddressCard = (shippingAddress?: {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
}): string => {
  if (!shippingAddress) return "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #fff8e6; border-radius: 2px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding-bottom: 12px;">
                <span style="font-size: 20px; vertical-align: middle;">📍</span>
                <span style="font-size: 14px; font-weight: 600; color: ${BRAND_COLORS.foreground}; margin-left: 8px; vertical-align: middle;">Shipping Address</span>
              </td>
            </tr>
            <tr>
              <td style="font-size: 14px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
                <strong>${shippingAddress.name}</strong><br>
                ${shippingAddress.address}<br>
                ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zip}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const trackingCard = (trackingNumber?: string): string => {
  if (!trackingNumber) return "";

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #e6f4ff; border-radius: 2px; margin: 20px 0;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td>
                <span style="font-size: 20px; vertical-align: middle;">📦</span>
                <span style="font-size: 14px; font-weight: 600; color: ${BRAND_COLORS.foreground}; margin-left: 8px; vertical-align: middle;">Tracking Number</span>
              </td>
            </tr>
            <tr>
              <td style="padding-top: 10px;">
                <span style="display: inline-block; background-color: #cce5ff; padding: 10px 16px; border-radius: 2px; font-size: 16px; font-weight: 700; color: ${BRAND_COLORS.foreground}; font-family: monospace;">
                  ${trackingNumber}
                </span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const totalRow = (total: number): string => {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
      <tr>
        <td style="padding: 16px 20px; background-color: ${BRAND_COLORS.foreground}; border-radius: 2px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="font-size: 14px; color: ${BRAND_COLORS.background};">Order Total</td>
              <td style="font-size: 24px; font-weight: 700; color: #ffffff; text-align: right;">
                $${total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const repContactCard = (repName: string, repEmail: string): string => {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: ${BRAND_COLORS.muted}; border-radius: 2px; margin: 25px 0;">
      <tr>
        <td style="padding: 20px 24px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
            <tr>
              <td style="padding-bottom: 10px; font-size: 13px; color: ${BRAND_COLORS.mutedForeground};">
                Questions? Contact your representative:
              </td>
            </tr>
            <tr>
              <td>
                <table role="presentation" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="width: 44px; height: 44px; background: linear-gradient(135deg, ${BRAND_COLORS.primary} 0%, ${BRAND_COLORS.secondary} 100%); border-radius: 2px; text-align: center; vertical-align: middle;">
                      <span style="font-size: 18px; color: #ffffff; font-weight: 600;">
                        ${repName.charAt(0).toUpperCase()}
                      </span>
                    </td>
                    <td style="padding-left: 14px;">
                      <div style="font-size: 15px; font-weight: 600; color: ${BRAND_COLORS.foreground};">${repName}</div>
                      <a href="mailto:${repEmail}" style="font-size: 13px; color: ${BRAND_COLORS.primary}; text-decoration: none;">${repEmail}</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `;
};

export const ctaButton = (
  text: string,
  url: string,
  color: string = BRAND_COLORS.primary
): string => {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
      <tr>
        <td align="center">
          <a href="${url}" style="display: inline-block; background-color: ${color}; color: #ffffff; padding: 16px 40px; border-radius: 2px; font-size: 16px; font-weight: 600; text-decoration: none;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
};

export const divider = (): string => {
  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
      <tr>
        <td style="padding: 15px 0;">
          <div style="height: 1px; background: linear-gradient(to right, transparent, ${BRAND_COLORS.border} 20%, ${BRAND_COLORS.border} 80%, transparent);"></div>
        </td>
      </tr>
    </table>
  `;
};

// Legacy helper for backwards compatibility
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
  return shippingAddressCard(shippingAddress);
};

export const formatTrackingBlock = (trackingNumber?: string): string => {
  return trackingCard(trackingNumber);
};
