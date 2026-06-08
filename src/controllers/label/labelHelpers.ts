import { PrivateLabelProduct } from "../../models/PrivateLabelProduct";

export async function getUnitPriceByProductType(productType: string): Promise<number> {
  const product = await PrivateLabelProduct.findOne({ name: productType, isActive: true });
  return product?.unitPrice || 0;
}

export async function isValidProductType(productType: string): Promise<boolean> {
  const product = await PrivateLabelProduct.findOne({ name: productType, isActive: true });
  return !!product;
}

export async function getProductTypeByOilType(oilType: string): Promise<string | null> {
  const keyword = oilType.toLowerCase();
  const product = await PrivateLabelProduct.findOne({
    name: { $regex: keyword, $options: "i" },
    isActive: true,
  });
  return product?.name ?? null;
}

export async function populateStageHistory(labels: any[]) {
  const { Admin } = await import("../../models/Admin");
  const { Rep } = await import("../../models/Rep");

  return Promise.all(
    labels.map(async (label) => {
      const labelObj = label.toObject ? label.toObject() : label;

      const populatedHistory = await Promise.all(
        labelObj.stageHistory.map(async (entry: any) => {
          if (!entry.changedBy) return entry;

          let user = null;
          if (entry.changedByType === "Admin") {
            user = await Admin.findById(entry.changedBy).select("name email");
          } else if (entry.changedByType === "Rep") {
            user = await Rep.findById(entry.changedBy).select("name email");
          }

          return {
            ...entry,
            changedBy: user
              ? { _id: user._id, name: user.name, email: user.email }
              : entry.changedBy,
          };
        })
      );

      return { ...labelObj, stageHistory: populatedHistory };
    })
  );
}
