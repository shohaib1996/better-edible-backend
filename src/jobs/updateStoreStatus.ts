import { Store } from '../models/Store';

export const updateStoreStatuses = async () => {
  const stores = await Store.find();

  const now = new Date();

  for (const store of stores) {
    let newStatus: 'green' | 'yellow' | 'red' = 'red';

    if (store.lastPaidAt) {
      const diffDays = (now.getTime() - store.lastPaidAt.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays <= 7) newStatus = 'green';
      else if (diffDays <= 30) newStatus = 'yellow';
    }

    if (store.paymentStatus !== newStatus) {
      store.paymentStatus = newStatus;
      await store.save();
    }
  }

  console.log('✅ Store payment statuses updated automatically');
};
