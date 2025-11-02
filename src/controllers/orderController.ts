// // src/controllers/orderController.ts
// import { Request, Response } from 'express';
// import { Order } from '../models/Order';
// import { Rep } from '../models/Rep';
// import { Store } from '../models/Store';
// import { Product } from '../models/Product';
// import mongoose from 'mongoose';

// // 🟩 Create order
// export const createOrder = async (req: Request, res: Response) => {
//   try {
//     const { repId, storeId, items, note } = req.body;

//     const rep = await Rep.findById(repId);
//     if (!rep) return res.status(404).json({ message: 'Rep not found' });
//     if (!rep.checkin) return res.status(400).json({ message: 'Rep must be checked in' });

//     const store = await Store.findById(storeId);
//     if (!store) return res.status(404).json({ message: 'Store not found' });
//     if (store.blocked) return res.status(400).json({ message: 'Store is blocked' });

//     // Build order items (denormalize product info)
//     const orderItems = await Promise.all(
//       items.map(async (item: any) => {
//         const product = await Product.findById(item.product);
//         if (!product) throw new Error(`Product not found: ${item.product}`);

//         const tier = product.priceTiers.find((t) => t.label === item.unitLabel) || product.priceTiers[0];
//         const price = tier?.discountPrice || tier?.price || 0;
//         return {
//           product: product._id,
//           name: product.name,
//           unitLabel: tier?.label,
//           unitPrice: tier?.price,
//           discountPrice: tier?.discountPrice || 0,
//           qty: item.qty,
//           lineTotal: price * item.qty,
//         };
//       })
//     );

//     const subtotal = orderItems.reduce((sum, i) => sum + i.lineTotal, 0);

//     const order = await Order.create({
//       store: store._id,
//       rep: rep._id,
//       items: orderItems,
//       subtotal,
//       total: subtotal,
//       note,
//     });

//     res.status(201).json(order);
//   } catch (error: any) {
//     res.status(500).json({ message: 'Error creating order', error: error.message });
//   }
// };

// // 🟨 Get all orders (with filters)
// export const getAllOrders = async (req: Request, res: Response) => {
//   try {
//     const { status, storeId, repId, page = 1, limit = 20 } = req.query;
//     const query: any = {};

//     if (status) query.status = status;
//     if (storeId) {
//       if (!mongoose.Types.ObjectId.isValid(storeId.toString()))
//         return res.status(400).json({ message: 'Invalid store ID' });
//       query.store = storeId;
//     }
//     if (repId) {
//       if (!mongoose.Types.ObjectId.isValid(repId.toString()))
//         return res.status(400).json({ message: 'Invalid rep ID' });
//       query.rep = repId;
//     }

//     const orders = await Order.find(query)
//       .select('orderNumber status total note deliveryDate createdAt store rep')
//       .populate('rep', 'name')
//       .populate('store', 'name address')
//       .skip((+page - 1) * +limit)
//       .limit(+limit)
//       .sort({ createdAt: -1 })
//       .lean();

//     const total = await Order.countDocuments(query);
//     res.json({ total, page: +page, limit: +limit, orders });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({ message: 'Error fetching orders', error });
//   }
// };

// // 🟦 Get order by ID
// export const getOrderById = async (req: Request, res: Response) => {
//   try {
//     const order = await Order.findById(req.params.id)
//       .populate('rep', 'name repType')
//       .populate('store', 'name blocked');
//     if (!order) return res.status(404).json({ message: 'Order not found' });
//     res.json(order);
//   } catch (error) {
//     res.status(500).json({ message: 'Error fetching order', error });
//   }
// };

// // 🟧 Update order (only allowed when draft)
// export const updateOrder = async (req: Request, res: Response) => {
//   try {
//     const order = await Order.findById(req.params.id);
//     if (!order) return res.status(404).json({ message: 'Order not found' });
//     if (order.status !== 'draft') return res.status(400).json({ message: 'Cannot edit non-draft order' });

//     Object.assign(order, req.body);
//     await order.save();
//     res.json(order);
//   } catch (error) {
//     res.status(500).json({ message: 'Error updating order', error });
//   }
// };

// // 🟫 Change order status (admin actions)
// export const changeOrderStatus = async (req: Request, res: Response) => {
//   try {
//     const { status } = req.body;
//     const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
//     if (!order) return res.status(404).json({ message: 'Order not found' });
//     res.json({ message: `Order moved to ${status}`, order });
//   } catch (error) {
//     res.status(500).json({ message: 'Error changing order status', error });
//   }
// };

// // 🟥 Collect payment (mark as collected)
// export const collectPayment = async (req: Request, res: Response) => {
//   try {
//     const { method, amount, repId } = req.body;

//     const order = await Order.findById(req.params.id);
//     if (!order) return res.status(404).json({ message: 'Order not found' });

//     order.payment = {
//       method,
//       amount,
//       collected: true,
//       collectedBy: repId,
//       collectedAt: new Date(),
//     };

//     await order.save();
//     res.json({ message: 'Payment collected successfully', order });
//   } catch (error) {
//     res.status(500).json({ message: 'Error collecting payment', error });
//   }
// };
