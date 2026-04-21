import crypto from "crypto";
import bcrypt from "bcryptjs";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";
import { Contact } from "../models/Contact";
import { Store } from "../models/Store";
import { resend, FROM_EMAIL } from "../services/email/config";

// POST /api/store-auth/login
export const loginStoreUser = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new AppError("Email and password are required", 400);

  const contact = await Contact.findOne({ email }).populate<{
    store: { _id: unknown; name: string; zip?: string };
  }>("store", "name zip");
  if (!contact) throw new AppError("Invalid credentials", 401);
  if (contact.status === "inactive") throw new AppError("Account is inactive", 403);

  const store = contact.store as { _id: unknown; name: string; zip?: string };
  if (!store) throw new AppError("Contact has no associated store", 400);

  // Lazy-init: hash the store zip as default password on first login
  if (!contact.passwordHash) {
    if (!store.zip)
      throw new AppError("Store has no zip code set — cannot initialize password", 400);
    contact.passwordHash = await bcrypt.hash(store.zip, 10);
    await contact.save();
  }

  const isMatch = await bcrypt.compare(password, contact.passwordHash);
  if (!isMatch) throw new AppError("Invalid credentials", 401);

  res.status(200).json({
    success: true,
    user: {
      contactId: contact._id,
      name: contact.name,
      email: contact.email,
      storeId: store._id,
      storeName: store.name,
      role: "store",
    },
  });
});

// POST /api/store-auth/magic-link
export const sendMagicLink = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new AppError("Email is required", 400);

  const contact = await Contact.findOne({ email }).populate<{ store: { name: string } }>(
    "store",
    "name"
  );
  if (!contact) throw new AppError("No account found for this email", 404);
  if (contact.status === "inactive") throw new AppError("Account is inactive", 403);

  const token = crypto.randomBytes(32).toString("hex");
  contact.magicLinkToken = token;
  contact.magicLinkExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 min
  await contact.save();

  const link = `${process.env.STORE_FRONTEND_URL || "https://better-edibles.com"}/store/login?token=${token}`;

  await resend.emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Your Better Edibles login link",
    html: `
      <p>Hi ${contact.name},</p>
      <p>Click the link below to log in to the Better Edibles store portal. This link expires in 15 minutes.</p>
      <p><a href="${link}">${link}</a></p>
      <p>If you did not request this, you can ignore this email.</p>
    `,
  });

  res.status(200).json({ success: true, message: "Magic link sent" });
});

// GET /api/store-auth/magic-link/:token
export const verifyMagicLink = asyncHandler(async (req, res) => {
  const { token } = req.params;

  const contact = await Contact.findOne({
    magicLinkToken: token,
    magicLinkExpiry: { $gt: new Date() },
  }).populate<{ store: { _id: unknown; name: string } }>("store", "name");

  if (!contact) throw new AppError("Invalid or expired magic link", 401);

  contact.magicLinkToken = undefined;
  contact.magicLinkExpiry = undefined;
  await contact.save();

  const store = contact.store as { _id: unknown; name: string };

  res.status(200).json({
    success: true,
    user: {
      contactId: contact._id,
      name: contact.name,
      email: contact.email,
      storeId: store._id,
      storeName: store.name,
      role: "store",
    },
  });
});

// POST /api/store-auth/change-password
export const changeStorePassword = asyncHandler(async (req, res) => {
  const { contactId, currentPassword, newPassword } = req.body;
  if (!contactId || !currentPassword || !newPassword) {
    throw new AppError("contactId, currentPassword and newPassword are required", 400);
  }

  const contact = await Contact.findById(contactId).populate<{ store: { zip?: string } }>(
    "store",
    "zip"
  );
  if (!contact) throw new AppError("Contact not found", 404);

  // Lazy-init if no password set yet
  if (!contact.passwordHash) {
    const store = contact.store as { zip?: string };
    if (!store?.zip) throw new AppError("Store has no zip code set", 400);
    contact.passwordHash = await bcrypt.hash(store.zip, 10);
  }

  const isMatch = await bcrypt.compare(currentPassword, contact.passwordHash);
  if (!isMatch) throw new AppError("Current password is incorrect", 401);

  contact.passwordHash = await bcrypt.hash(newPassword, 10);
  await contact.save();

  res.status(200).json({ success: true, message: "Password updated" });
});

// POST /api/store-auth/logout
export const logoutStoreUser = asyncHandler(async (_req, res) => {
  res.status(200).json({ success: true, message: "Logout successful" });
});
