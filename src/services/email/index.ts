// src/services/email/index.ts
// Re-export all email functions for convenient imports

export {
  sendSevenDayReminderEmail,
  sendReadyToShipEmail,
  sendOrderShippedEmail,
  sendOrderShippedRepEmail,
  sendRecurringOrderCreatedEmail,
  sendOrderCreatedClientEmail,
  sendOrderInProductionEmail,
} from "./templates/orderEmails";

export {
  sendLabelApprovedByStoreEmail,
  sendLabelApprovalRequestEmail,
} from "./templates/labelEmails";

// Re-export types for consumers
export type {
  OrderEmailData,
  LabelApprovalRequestData,
  LabelApprovedByStoreData,
  OrderShippedRepData,
  RecurringOrderCreatedData,
} from "./types";
