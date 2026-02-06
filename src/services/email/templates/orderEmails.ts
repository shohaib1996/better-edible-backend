// src/services/email/templates/orderEmails.ts
import { resend, FROM_EMAIL } from "../config";
import {
  OrderEmailData,
  OrderShippedRepData,
  RecurringOrderCreatedData,
} from "../types";
import {
  formatItemsList,
  formatShippingAddressBlock,
  formatTrackingBlock,
} from "../helpers";

// 7-Day Reminder Email
export const sendSevenDayReminderEmail = async (
  data: OrderEmailData
): Promise<boolean> => {
  try {
    const itemsList = formatItemsList(data.items);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `Your order ships in 7 days! (${data.orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Hi ${data.clientName},</h2>

          <p>Just a friendly reminder that your Better Edibles private label order is scheduled for delivery in <strong>7 days</strong>!</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Scheduled Delivery:</strong> ${data.deliveryDate}</p>
          </div>

          <h3>Order Details:</h3>
          <pre style="background-color: #f9f9f9; padding: 15px; border-radius: 4px;">${itemsList}</pre>

          <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>

          <p>Your order is currently in production and on track for delivery. If you have any questions, contact your rep:</p>

          <p>
            <strong>${data.repName}</strong><br>
            <a href="mailto:${data.repEmail}">${data.repEmail}</a>
          </p>

          <p style="margin-top: 30px;">Thanks for choosing Better Edibles!</p>
        </div>
      `,
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
    const itemsList = formatItemsList(data.items);
    const addressBlock = formatShippingAddressBlock(data.shippingAddress);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `Your order is ready to ship! (${data.orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Great news, ${data.clientName}!</h2>

          <p>Your Better Edibles private label order is <strong>complete and ready to ship</strong>!</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Scheduled Delivery:</strong> ${data.deliveryDate}</p>
          </div>

          ${addressBlock}

          <h3>Order Details:</h3>
          <pre style="background-color: #f9f9f9; padding: 15px; border-radius: 4px;">${itemsList}</pre>

          <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>

          <p>Questions? Contact ${data.repName} at <a href="mailto:${data.repEmail}">${data.repEmail}</a></p>

          <p style="margin-top: 30px;">Thanks for choosing Better Edibles!</p>
        </div>
      `,
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
    const itemsList = formatItemsList(data.items);
    const trackingBlock = formatTrackingBlock(data.trackingNumber);
    const addressBlock = formatShippingAddressBlock(data.shippingAddress);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `Your order has shipped! (${data.orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Great news, ${data.clientName}!</h2>

          <p>Your Better Edibles private label order has been <strong>shipped</strong> and is on its way!</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Expected Delivery:</strong> ${data.deliveryDate}</p>
          </div>

          ${trackingBlock}
          ${addressBlock}

          <h3>Order Details:</h3>
          <pre style="background-color: #f9f9f9; padding: 15px; border-radius: 4px;">${itemsList}</pre>

          <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>

          <p>Questions about your shipment? Contact ${data.repName} at <a href="mailto:${data.repEmail}">${data.repEmail}</a></p>

          <p style="margin-top: 30px;">Thanks for choosing Better Edibles!</p>
        </div>
      `,
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
    const trackingInfo = data.trackingNumber
      ? `<p style="margin: 10px 0 0;"><strong>Tracking:</strong> ${data.trackingNumber}</p>`
      : "";

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.repEmail,
      subject: `📦 Order shipped for ${data.clientName} (${data.orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Hi ${data.repName},</h2>

          <p>Order <strong>${data.orderNumber}</strong> for <strong>${data.clientName}</strong> has been shipped!</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Client:</strong> ${data.clientName}</p>
            <p style="margin: 10px 0 0;"><strong>Expected Delivery:</strong> ${data.deliveryDate}</p>
            <p style="margin: 10px 0 0;"><strong>Total:</strong> $${data.total.toFixed(2)}</p>
            ${trackingInfo}
          </div>

          <p style="margin-top: 30px;">— Better Edibles System</p>
        </div>
      `,
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
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.repEmail,
      subject: `🔄 Recurring order created for ${data.clientName} (${data.orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Hi ${data.repName},</h2>

          <p>A recurring order has been automatically created for <strong>${data.clientName}</strong>.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>New Order Number:</strong> ${data.orderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Based on:</strong> ${data.parentOrderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Delivery Date:</strong> ${data.deliveryDate}</p>
            <p style="margin: 10px 0 0;"><strong>Total:</strong> $${data.total.toFixed(2)}</p>
          </div>

          <p>You can review and modify this order while it's still in "Waiting" status.</p>

          <p style="margin-top: 30px;">— Better Edibles System</p>
        </div>
      `,
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
    const itemsList = formatItemsList(data.items);

    const recurringNote = data.isRecurring
      ? `<p style="background-color: #fff3cd; padding: 10px; border-radius: 4px; margin: 15px 0;"><strong>Note:</strong> This is a recurring order that was automatically created based on your subscription schedule.</p>`
      : "";

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `Order Confirmed! (${data.orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Hi ${data.clientName},</h2>

          <p>Thank you for your order! We're excited to confirm that your Better Edibles private label order has been received.</p>

          ${recurringNote}

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Scheduled Delivery:</strong> ${data.deliveryDate}</p>
          </div>

          <h3>Order Details:</h3>
          <pre style="background-color: #f9f9f9; padding: 15px; border-radius: 4px;">${itemsList}</pre>

          <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>

          <p>Your order is currently in the queue and will enter production soon. We'll notify you when production begins.</p>

          <p>If you have any questions, contact your rep:</p>

          <p>
            <strong>${data.repName}</strong><br>
            <a href="mailto:${data.repEmail}">${data.repEmail}</a>
          </p>

          <p style="margin-top: 30px;">Thanks for choosing Better Edibles!</p>
        </div>
      `,
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
    const itemsList = formatItemsList(data.items);

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.contactEmail,
      subject: `Your order is now in production! (${data.orderNumber})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Great news, ${data.clientName}!</h2>

          <p>Your Better Edibles private label order has entered <strong>production</strong>!</p>

          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2d5016;">
            <p style="margin: 0;"><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p style="margin: 10px 0 0;"><strong>Scheduled Delivery:</strong> ${data.deliveryDate}</p>
            <p style="margin: 10px 0 0;"><strong>Status:</strong> In Production</p>
          </div>

          <h3>Order Details:</h3>
          <pre style="background-color: #f9f9f9; padding: 15px; border-radius: 4px;">${itemsList}</pre>

          <p><strong>Total:</strong> $${data.total.toFixed(2)}</p>

          <p>We're now crafting your products with care. You'll receive another notification when your order is ready to ship.</p>

          <p>Questions? Contact ${data.repName} at <a href="mailto:${data.repEmail}">${data.repEmail}</a></p>

          <p style="margin-top: 30px;">Thanks for choosing Better Edibles!</p>
        </div>
      `,
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
