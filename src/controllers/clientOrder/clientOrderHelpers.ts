import { Admin } from "../../models/Admin";
import { PrivateLabelProduct } from "../../models/PrivateLabelProduct";

export async function getUnitPriceByProductType(productType: string): Promise<number> {
  const product = await PrivateLabelProduct.findOne({
    name: { $regex: new RegExp(`^${productType}$`, "i") },
    isActive: true,
  });
  return product?.unitPrice || 0;
}

export async function populateCreatedBy(
  createdBy: { user: unknown; userType: string } | undefined
) {
  if (!createdBy?.user) return createdBy;

  const { Rep } = await import("../../models/Rep");
  const creator =
    createdBy.userType === "admin"
      ? await Admin.findById(createdBy.user).select("name").lean()
      : await Rep.findById(createdBy.user).select("name").lean();

  return {
    user: { _id: createdBy.user, name: (creator as any)?.name || "Unknown" },
    userType: createdBy.userType,
  };
}
