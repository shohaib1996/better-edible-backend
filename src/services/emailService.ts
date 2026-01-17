// src/services/emailService.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Better Edibles <noreply@betteredibles.com>";

// -------------------
// Email Templates
// -------------------

interface OrderEmailData {
  clientName: string;
  contactEmail: string;
  orderNumber: string;
  deliveryDate: string;
  items: Array<{
    flavorName: string;
    productType: string;
    quantity: number;
  }>;
  total: number;
  repName: string;
  repEmail: string;
  shippingAddress?: {
    name: string;
    address: string;
    city: string;
    state: string;
    zip: string;
  };
}

// 7-Day Reminder Email
export const sendSevenDayReminderEmail = async (
  data: OrderEmailData
): Promise<boolean> => {
  try {
    const itemsList = data.items
      .map((item) => `• ${item.flavorName} ${item.productType} - ${item.quantity} units`)
      .join("\n");

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

    console.log(`✅ 7-day reminder sent to ${data.contactEmail} for ${data.orderNumber}`);
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
    const itemsList = data.items
      .map((item) => `• ${item.flavorName} ${item.productType} - ${item.quantity} units`)
      .join("\n");

    const addressBlock = data.shippingAddress
      ? `
        <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <strong>Shipping To:</strong><br>
          ${data.shippingAddress.name}<br>
          ${data.shippingAddress.address}<br>
          ${data.shippingAddress.city}, ${data.shippingAddress.state} ${data.shippingAddress.zip}
        </div>
      `
      : "";

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

    console.log(`✅ Ready-to-ship email sent to ${data.contactEmail} for ${data.orderNumber}`);
    return true;
  } catch (err) {
    console.error("Error sending ready-to-ship email:", err);
    return false;
  }
};

// Recurring Order Created Notification (to rep)
export const sendRecurringOrderCreatedEmail = async (data: {
  repEmail: string;
  repName: string;
  clientName: string;
  orderNumber: string;
  parentOrderNumber: string;
  deliveryDate: string;
  total: number;
}): Promise<boolean> => {
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
