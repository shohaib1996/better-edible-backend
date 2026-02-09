// src/services/email/templates/labelEmails.ts
import { resend, FROM_EMAIL } from "../config";
import { LabelApprovalRequestData, LabelApprovedByStoreData } from "../types";
import {
  emailWrapper,
  headerBanner,
  infoCard,
  repContactCard,
  ctaButton,
  labelImageBlock,
  BRAND_COLORS,
} from "../helpers";

// Label Approved by Store Notification (to rep)
export const sendLabelApprovedByStoreEmail = async (
  data: LabelApprovedByStoreData
): Promise<boolean> => {
  try {
    const imageBlock = data.labelImageUrl
      ? labelImageBlock(data.labelImageUrl, data.flavorName, true)
      : "";

    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("✅", "Label Approved!", BRAND_COLORS.primary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Hi <strong>${data.repName}</strong>,
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Great news! <strong>${data.storeName}</strong> has approved their label design. 🎉
            </p>

            ${infoCard(
              [
                { label: "Store", value: data.storeName },
                { label: "Flavor", value: data.flavorName },
                { label: "Product Type", value: data.productType },
                { label: "New Status", value: "✓ Store Approved" },
              ],
              BRAND_COLORS.primary
            )}

            ${imageBlock}

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
              <tr>
                <td style="padding: 16px 20px; background-color: #fff8e6; border-radius: 2px;">
                  <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.foreground}; line-height: 1.5;">
                    🚀 The label has been moved to <strong>"Store Approved"</strong> status and is ready for the next step in the approval process.
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
      subject: `✅ Label Approved: ${data.flavorName} (${data.productType}) - ${data.storeName}`,
      html: emailWrapper(content),
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
      ? ctaButton("✓ Approve This Label", data.approvalLink, BRAND_COLORS.primary)
      : "";

    const expiryNote = data.approvalLink
      ? `
        <p style="margin: 0; font-size: 12px; color: ${BRAND_COLORS.mutedForeground}; text-align: center;">
          This approval link expires in 7 days.
        </p>
      `
      : "";

    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("🏷️", "Label Approval Required", BRAND_COLORS.secondary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Hi <strong>${data.storeName}</strong>,
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              A new label design is ready for your review and approval. Please take a moment to review the design below.
            </p>

            ${infoCard(
              [
                { label: "Flavor", value: data.flavorName },
                { label: "Product Type", value: data.productType },
              ],
              BRAND_COLORS.secondary
            )}

            <h3 style="margin: 30px 0 15px; font-size: 16px; font-weight: 600; color: ${BRAND_COLORS.foreground}; text-align: center;">
              Label Design Preview
            </h3>

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
              <tr>
                <td align="center">
                  <div style="padding: 25px; background: linear-gradient(135deg, ${BRAND_COLORS.muted} 0%, #fff8e6 100%); border-radius: 2px; border: 2px solid ${BRAND_COLORS.border};">
                    <a href="${data.labelImageUrl}" target="_blank" style="display: block;">
                      <img src="${data.labelImageUrl}" alt="${data.flavorName} Label - Click to view" width="300" style="max-width: 100%; max-height: 350px; border-radius: 2px; box-shadow: 0 10px 25px rgba(247, 127, 0, 0.15); display: block; margin: 0 auto;" />
                    </a>
                  </div>
                </td>
              </tr>
              <tr>
                <td align="center" style="padding-top: 12px;">
                  <a href="${data.labelImageUrl}" target="_blank" style="font-size: 13px; color: ${BRAND_COLORS.primary}; text-decoration: none;">
                    🔗 Click here to view label image
                  </a>
                </td>
              </tr>
            </table>

            ${approvalButton}
            ${expiryNote}

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0 0;">
              <tr>
                <td style="padding: 16px 20px; background-color: #fff8e6; border-radius: 2px; border-left: 4px solid ${BRAND_COLORS.secondary};">
                  <p style="margin: 0; font-size: 14px; color: ${BRAND_COLORS.foreground}; line-height: 1.5;">
                    💬 <strong>Need changes?</strong> If you have any feedback or need modifications to this design, please contact your representative below.
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
      to: data.storeEmail,
      subject: `🏷️ Label Approval Required: ${data.flavorName} (${data.productType})`,
      html: emailWrapper(content),
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
