import { resend, FROM_EMAIL } from "../config";
import { emailWrapper, headerBanner, ctaButton, BRAND_COLORS } from "../helpers";

export const sendMagicLinkEmail = async (
  name: string,
  email: string,
  link: string
): Promise<boolean> => {
  try {
    const content = `
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
        <tr>
          ${headerBanner("🔑", "Your Sign-In Link", BRAND_COLORS.primary)}
        </tr>
        <tr>
          <td style="padding: 35px 40px;">
            <p style="margin: 0 0 20px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Hi <strong>${name}</strong>,
            </p>
            <p style="margin: 0 0 25px; font-size: 16px; color: ${BRAND_COLORS.foreground}; line-height: 1.6;">
              Click the button below to sign in to the Better Edibles Store Portal. This link expires in <strong style="color: ${BRAND_COLORS.primary};">15 minutes</strong>.
            </p>

            ${ctaButton("Sign In to Store Portal", link, BRAND_COLORS.primary)}

            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 20px 0;">
              <tr>
                <td style="padding: 16px 20px; background-color: ${BRAND_COLORS.muted}; border-radius: 2px; border-left: 4px solid ${BRAND_COLORS.secondary};">
                  <p style="margin: 0; font-size: 13px; color: ${BRAND_COLORS.mutedForeground}; line-height: 1.5;">
                    🔒 <strong>Security note:</strong> If the button doesn't work, copy and paste this link into your browser:<br>
                    <span style="word-break: break-all; color: ${BRAND_COLORS.primary};">${link}</span>
                  </p>
                </td>
              </tr>
            </table>

            <p style="margin: 25px 0 0; font-size: 13px; color: ${BRAND_COLORS.mutedForeground}; text-align: center; line-height: 1.5;">
              If you did not request this link, you can safely ignore this email.<br>Your account will not be affected.
            </p>
          </td>
        </tr>
      </table>
    `;

    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: "Your Better Edibles sign-in link",
      html: emailWrapper(content),
    });

    if (error) {
      console.error("Failed to send magic link email:", error);
      return false;
    }

    console.log(`✅ Magic link email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Error sending magic link email:", err);
    return false;
  }
};
