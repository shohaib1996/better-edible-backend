// src/services/emailService.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Better Edibles <noreply@better-edibles.com>";
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
  data: OrderEmailData,
): Promise<boolean> => {
  try {
    const itemsList = data.items
      .map(
        (item) =>
          `• ${item.flavorName} ${item.productType} - ${item.quantity} units`,
      )
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

    console.log(
      `✅ 7-day reminder sent to ${data.contactEmail} for ${data.orderNumber}`,
    );
    return true;
  } catch (err) {
    console.error("Error sending 7-day reminder email:", err);
    return false;
  }
};

// Ready to Ship Email
export const sendReadyToShipEmail = async (
  data: OrderEmailData,
): Promise<boolean> => {
  try {
    const itemsList = data.items
      .map(
        (item) =>
          `• ${item.flavorName} ${item.productType} - ${item.quantity} units`,
      )
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

    console.log(
      `✅ Ready-to-ship email sent to ${data.contactEmail} for ${data.orderNumber}`,
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
    const itemsList = data.items
      .map(
        (item) =>
          `• ${item.flavorName} ${item.productType} - ${item.quantity} units`
      )
      .join("\n");

    const trackingBlock = data.trackingNumber
      ? `
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 8px; margin: 15px 0;">
          <strong>Tracking Number:</strong> ${data.trackingNumber}
        </div>
      `
      : "";

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
export const sendOrderShippedRepEmail = async (data: {
  repEmail: string;
  repName: string;
  clientName: string;
  orderNumber: string;
  deliveryDate: string;
  total: number;
  trackingNumber?: string;
}): Promise<boolean> => {
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

// Label Approved by Store Notification (to rep)
export const sendLabelApprovedByStoreEmail = async (data: {
  repEmail: string;
  repName: string;
  storeName: string;
  flavorName: string;
  productType: string;
  labelImageUrl?: string;
}): Promise<boolean> => {
  try {
    const imageBlock = data.labelImageUrl
      ? `
        <div style="text-align: center; margin: 20px 0;">
          <img src="${data.labelImageUrl}" alt="${data.flavorName} Label" style="max-width: 100%; max-height: 300px; border-radius: 8px; border: 1px solid #ddd;" />
        </div>
      `
      : "";

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.repEmail,
      subject: `✅ Label Approved: ${data.flavorName} (${data.productType}) - ${data.storeName}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Hi ${data.repName},</h2>

          <p>Great news! <strong>${data.storeName}</strong> has approved their label design.</p>

          <div style="background-color: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #2d5016;">
            <p style="margin: 0;"><strong>Flavor:</strong> ${data.flavorName}</p>
            <p style="margin: 10px 0 0;"><strong>Product Type:</strong> ${data.productType}</p>
            <p style="margin: 10px 0 0;"><strong>Store:</strong> ${data.storeName}</p>
            <p style="margin: 10px 0 0;"><strong>New Status:</strong> Store Approved</p>
          </div>

          ${imageBlock}

          <p>The label has been moved to <strong>"Store Approved"</strong> status and is ready for the next step in the approval process.</p>

          <p style="margin-top: 30px;">— Better Edibles System</p>
        </div>
      `,
    });

    if (error) {
      console.error("Failed to send label approved by store email:", error);
      return false;
    }

    console.log(
      `✅ Label approved notification sent to rep ${data.repEmail} for ${data.flavorName}`
    );
    return true;
  } catch (err) {
    console.error("Error sending label approved by store email:", err);
    return false;
  }
};

// Label Approval Request Email (to store)
export const sendLabelApprovalRequestEmail = async (data: {
  storeEmail: string;
  storeName: string;
  flavorName: string;
  productType: string;
  labelImageUrl: string;
  repName: string;
  repEmail: string;
  approvalLink?: string;
}): Promise<boolean> => {
  try {
    const approvalButton = data.approvalLink
      ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${data.approvalLink}" style="display: inline-block; background-color: #2d5016; color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;">
            ✓ Approve This Label
          </a>
        </div>
        <p style="text-align: center; color: #666; font-size: 12px;">This approval link expires in 7 days.</p>
      `
      : "";

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: data.storeEmail,
      subject: `Label Approval Required: ${data.flavorName} (${data.productType})`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2d5016;">Hi ${data.storeName},</h2>

          <p>A new label design is ready for your review and approval.</p>

          <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Flavor:</strong> ${data.flavorName}</p>
            <p style="margin: 10px 0 0;"><strong>Product Type:</strong> ${data.productType}</p>
          </div>

          <h3>Label Design:</h3>
          <div style="text-align: center; margin: 20px 0;">
            <img src="${data.labelImageUrl}" alt="${data.flavorName} Label" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 1px solid #ddd;" />
          </div>

          ${approvalButton}

          <p>If you have any feedback or need changes, contact your rep:</p>

          <p>
            <strong>${data.repName}</strong><br>
            <a href="mailto:${data.repEmail}">${data.repEmail}</a>
          </p>

          <p style="margin-top: 30px;">Thanks for choosing Better Edibles!</p>
        </div>
      `,
    });

    if (error) {
      console.error("Failed to send label approval request email:", error);
      return false;
    }

    console.log(
      `✅ Label approval request sent to ${data.storeEmail} for ${data.flavorName}`
    );
    return true;
  } catch (err) {
    console.error("Error sending label approval request email:", err);
    return false;
  }
};
