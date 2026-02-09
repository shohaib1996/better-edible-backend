// src/services/email/templates/orderEmails.ts
import { resend, FROM_EMAIL } from "../config";
import {
  OrderEmailData,
  OrderShippedRepData,
  RecurringOrderCreatedData,
} from "../types";
import {
  emailWrapper,
  headerBanner,
  formatItemsTable,
  infoCard,
  shippingAddressCard,
  trackingCard,
  totalRow,
  repContactCard,
  BRAND_COLORS,
} from "../helpers";

// 7-Day Reminder Email
export const sendSevenDayReminderEmail = async (
  data: OrderEmailData
): Promise<boolean> => {
  try {
    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("⏰", "7 Days Until Delivery!", BRAND_COLORS.secondary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Hi <strong>${data.clientName}</strong>,
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Just a friendly reminder that your Better Edibles private label order is scheduled for delivery in <strong style="color: ${BRAND_COLORS.primary};">7 days</strong>!
            </p>

            ${infoCard(
              [
                { label: "Order Number", value: data.orderNumber },
                { label: "Delivery Date", value: data.deliveryDate },
                { label: "Status", value: "In Production" },
              ],
              BRAND_COLORS.secondary
            )}

            <h3 style="margin: 30px 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.foreground};">
              Order Items
            </h3>
            ${formatItemsTable(data.items)}

            ${totalRow(data.total)}

            <p style="margin: 25px 0 0; font-size: 15px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Your order is currently in production and on track for delivery. We'll notify you when it's ready to ship!
            </p>

            ${repContactCard(data.repName, data.repEmail)}

            <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.primary}; font-weight: 500; text-align: center;">
              Thanks for choosing Better Edibles! 🌿
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `⏰ Your order ships in 7 days! (${data.orderNumber})`,
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send 7-day reminder email:", error);
      return false;
    }

    console.log(
      `✅ 7-day reminder sent to ${data.contactEmail} for ${data.orderNumber}`
    );
    return true;
  } catch (err) {
    console.error("Error sending 7-day reminder email:", err);
    return false;
  }
};

// Ready to Ship Email
export const sendReadyToShipEmail = async (
  data: OrderEmailData
): Promise<boolean> => {
  try {
    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("🎉", "Your Order is Ready to Ship!", BRAND_COLORS.primary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Great news, <strong>${data.clientName}</strong>!
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Your Better Edibles private label order is <strong style="color: ${BRAND_COLORS.primary};">complete and ready to ship</strong>! 📦
            </p>

            ${infoCard(
              [
                { label: "Order Number", value: data.orderNumber },
                { label: "Delivery Date", value: data.deliveryDate },
                { label: "Status", value: "✓ Ready to Ship" },
              ],
              BRAND_COLORS.primary
            )}

            ${shippingAddressCard(data.shippingAddress)}

            <h3 style="margin: 30px 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.foreground};">
              Order Items
            </h3>
            ${formatItemsTable(data.items)}

            ${totalRow(data.total)}

            ${repContactCard(data.repName, data.repEmail)}

            <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.primary}; font-weight: 500; text-align: center;">
              Thanks for choosing Better Edibles! 🌿
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `🎉 Your order is ready to ship! (${data.orderNumber})`,
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send ready-to-ship email:", error);
      return false;
    }

    console.log(
      `✅ Ready-to-ship email sent to ${data.contactEmail} for ${data.orderNumber}`
    );
    return true;
  } catch (err) {
    console.error("Error sending ready-to-ship email:", err);
    return false;
  }
};

// Order Shipped Email (to client)
export const sendOrderShippedEmail = async (
  data: OrderEmailData & { trackingNumber?: string }
): Promise<boolean> => {
  try {
    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("🚚", "Your Order Has Shipped!", BRAND_COLORS.primary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Great news, <strong>${data.clientName}</strong>!
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Your Better Edibles private label order has been <strong style="color: ${BRAND_COLORS.primary};">shipped</strong> and is on its way to you!
            </p>

            ${infoCard(
              [
                { label: "Order Number", value: data.orderNumber },
                { label: "Expected Delivery", value: data.deliveryDate },
                { label: "Status", value: "🚚 Shipped" },
              ],
              BRAND_COLORS.primary
            )}

            ${trackingCard(data.trackingNumber)}
            ${shippingAddressCard(data.shippingAddress)}

            <h3 style="margin: 30px 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.foreground};">
              Order Items
            </h3>
            ${formatItemsTable(data.items)}

            ${totalRow(data.total)}

            ${repContactCard(data.repName, data.repEmail)}

            <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.primary}; font-weight: 500; text-align: center;">
              Thanks for choosing Better Edibles! 🌿
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `🚚 Your order has shipped! (${data.orderNumber})`,
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send order shipped email:", error);
      return false;
    }

    console.log(
      `✅ Order shipped email sent to ${data.contactEmail} for ${data.orderNumber}`
    );
    return true;
  } catch (err) {
    console.error("Error sending order shipped email:", err);
    return false;
  }
};

// Order Shipped Notification (to rep)
export const sendOrderShippedRepEmail = async (
  data: OrderShippedRepData
): Promise<boolean> => {
  try {
    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("📦", "Order Shipped!", BRAND_COLORS.primary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Hi <strong>${data.repName}</strong>,
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Order <strong>${data.orderNumber}</strong> for <strong>${data.clientName}</strong> has been shipped!
            </p>

            ${infoCard(
              [
                { label: "Order Number", value: data.orderNumber },
                { label: "Client", value: data.clientName },
                { label: "Expected Delivery", value: data.deliveryDate },
                {
                  label: "Total",
                  value: `$${data.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
              ],
              BRAND_COLORS.primary
            )}

            ${trackingCard(data.trackingNumber)}

            <p style="margin: 25px 0 0; padding: 16px; background-color: ${BRAND_COLORS.muted}; border-radius: 2px; font-size: 13px; color: ${BRAND_COLORS.mutedForeground}; text-align: center;">
              — Better Edibles System
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.repEmail,
      subject: `📦 Order shipped for ${data.clientName} (${data.orderNumber})`,
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send order shipped rep notification:", error);
      return false;
    }

    console.log(`✅ Order shipped notification sent to rep ${data.repEmail}`);
    return true;
  } catch (err) {
    console.error("Error sending order shipped rep notification:", err);
    return false;
  }
};

// Recurring Order Created Notification (to rep)
export const sendRecurringOrderCreatedEmail = async (
  data: RecurringOrderCreatedData
): Promise<boolean> => {
  try {
    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("🔄", "Recurring Order Created", BRAND_COLORS.secondary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Hi <strong>${data.repName}</strong>,
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              A recurring order has been automatically created for <strong>${data.clientName}</strong>.
            </p>

            ${infoCard(
              [
                { label: "New Order", value: data.orderNumber },
                { label: "Based On", value: data.parentOrderNumber },
                { label: "Client", value: data.clientName },
                { label: "Delivery Date", value: data.deliveryDate },
                {
                  label: "Total",
                  value: `$${data.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                },
              ],
              BRAND_COLORS.secondary
            )}

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
              <tr>
                <td style="padding: 16px 20px; background-color: #fff8e6; border-radius: 2px; border-left: 4px solid ${BRAND_COLORS.secondary};">
                  <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.foreground}; line-height: 1.5;">
                    💡 <strong>Tip:</strong> You can review and modify this order while it's still in "Waiting" status.
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin: 25px 0 0; padding: 16px; background-color: ${BRAND_COLORS.muted}; border-radius: 2px; font-size: 13px; color: ${BRAND_COLORS.mutedForeground}; text-align: center;">
              — Better Edibles System
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.repEmail,
      subject: `🔄 Recurring order created for ${data.clientName} (${data.orderNumber})`,
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send recurring order notification:", error);
      return false;
    }

    console.log(`✅ Recurring order notification sent to ${data.repEmail}`);
    return true;
  } catch (err) {
    console.error("Error sending recurring order notification:", err);
    return false;
  }
};

// Order Created Confirmation Email (to client)
export const sendOrderCreatedClientEmail = async (
  data: OrderEmailData & { isRecurring?: boolean }
): Promise<boolean> => {
  try {
    const recurringNote = data.isRecurring
      ? `
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
          <tr>
            <td style="padding: 16px 20px; background-color: #fff8e6; border-radius: 2px; border-left: 4px solid ${BRAND_COLORS.secondary};">
              <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.foreground}; line-height: 1.5;">
                🔄 <strong>Note:</strong> This is a recurring order that was automatically created based on your subscription schedule.
              </p>
            </td>
          </tr>
        </table>
      `
      : "";

    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("✅", "Order Confirmed!", BRAND_COLORS.primary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Hi <strong>${data.clientName}</strong>,
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Thank you for your order! We're excited to confirm that your Better Edibles private label order has been received. 🎉
            </p>

            ${recurringNote}

            ${infoCard(
              [
                { label: "Order Number", value: data.orderNumber },
                { label: "Delivery Date", value: data.deliveryDate },
                { label: "Status", value: "Order Received" },
              ],
              BRAND_COLORS.primary
            )}

            <h3 style="margin: 30px 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.foreground};">
              Order Items
            </h3>
            ${formatItemsTable(data.items)}

            ${totalRow(data.total)}

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
              <tr>
                <td style="padding: 16px 20px; background-color: #fff8e6; border-radius: 2px;">
                  <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.foreground}; line-height: 1.5;">
                    📋 Your order is currently in the queue and will enter production soon. We'll notify you when production begins.
                  </p>
                </td>
              </tr>
            </table>

            ${repContactCard(data.repName, data.repEmail)}

            <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.primary}; font-weight: 500; text-align: center;">
              Thanks for choosing Better Edibles! 🌿
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `✅ Order Confirmed! (${data.orderNumber})`,
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send order created email:", error);
      return false;
    }

    console.log(
      `✅ Order created confirmation sent to ${data.contactEmail} for ${data.orderNumber}`
    );
    return true;
  } catch (err) {
    console.error("Error sending order created email:", err);
    return false;
  }
};

// Order In Production Email (to client)
export const sendOrderInProductionEmail = async (
  data: OrderEmailData
): Promise<boolean> => {
  try {
    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("🏭", "Your Order is in Production!", BRAND_COLORS.primary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Great news, <strong>${data.clientName}</strong>!
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Your Better Edibles private label order has entered <strong style="color: ${BRAND_COLORS.primary};">production</strong>! 🎉
            </p>

            ${infoCard(
              [
                { label: "Order Number", value: data.orderNumber },
                { label: "Delivery Date", value: data.deliveryDate },
                { label: "Status", value: "🏭 In Production" },
              ],
              BRAND_COLORS.primary
            )}

            <h3 style="margin: 30px 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.foreground};">
              Order Items
            </h3>
            ${formatItemsTable(data.items)}

            ${totalRow(data.total)}

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
              <tr>
                <td style="padding: 16px 20px; background-color: #fff8e6; border-radius: 2px;">
                  <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.foreground}; line-height: 1.5;">
                    🌟 We're now crafting your products with care. You'll receive another notification when your order is ready to ship.
                  </p>
                </td>
              </tr>
            </table>

            ${repContactCard(data.repName, data.repEmail)}

            <p style="margin: 0; font-size: 15px; color: ${BRAND_COLORS.primary}; font-weight: 500; text-align: center;">
              Thanks for choosing Better Edibles! 🌿
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `🏭 Your order is now in production! (${data.orderNumber})`,
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send order in production email:", error);
      return false;
    }

    console.log(
      `✅ Order in production email sent to ${data.contactEmail} for ${data.orderNumber}`
    );
    return true;
  } catch (err) {
    console.error("Error sending order in production email:", err);
    return false;
  }
};
