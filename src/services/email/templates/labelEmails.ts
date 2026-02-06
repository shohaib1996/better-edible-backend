// src/services/email/templates/labelEmails.ts
import { resend, FROM_EMAIL } from "../config";
import { LabelApprovalRequestData, LabelApprovedByStoreData } from "../types";

// Label Approved by Store Notification (to rep)
export const sendLabelApprovedByStoreEmail = async (
  data: LabelApprovedByStoreData
): Promise<boolean> => {
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
export const sendLabelApprovalRequestEmail = async (
  data: LabelApprovalRequestData
): Promise<boolean> => {
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
