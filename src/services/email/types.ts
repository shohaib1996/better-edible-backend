// src/services/email/types.ts

export interface OrderEmailData {
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

export interface LabelApprovalRequestData {
  storeEmail: string;
  storeName: string;
  flavorName: string;
  productType: string;
  labelImageUrl: string;
  repName: string;
  repEmail: string;
  approvalLink?: string;
}

export interface LabelApprovedByStoreData {
  repEmail: string;
  repName: string;
  storeName: string;
  flavorName: string;
  productType: string;
  labelImageUrl?: string;
}

export interface OrderShippedRepData {
  repEmail: string;
  repName: string;
  clientName: string;
  orderNumber: string;
  deliveryDate: string;
  total: number;
  trackingNumber?: string;
}

export interface RecurringOrderCreatedData {
  repEmail: string;
  repName: string;
  clientName: string;
  orderNumber: string;
  parentOrderNumber: string;
  deliveryDate: string;
  total: number;
}
