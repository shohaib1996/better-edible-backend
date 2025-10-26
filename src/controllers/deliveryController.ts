// src/controllers/deliveryController.ts
import { Request, Response } from 'express';
import { Delivery } from '../models/Delivery';
import { Order } from '../models/Order';
import { Rep } from '../models/Rep';

// 🟩 Create delivery assignment
export const createDelivery = async (req: Request, res: Response) => {
  try {
    const { orderId, assignedTo, disposition, paymentAction, scheduledAt, notes } = req.body;

    const order = await Order.findById(orderId);
    if (!order) return res.status(404).json({ message: 'Order not found' });

    const rep = await Rep.findById(assignedTo);
    if (!rep) return res.status(404).json({ message: 'Delivery rep not found' });
    if (!['delivery', 'both'].includes(rep.repType))
      return res.status(400).json({ message: 'Rep is not authorized for delivery' });

    const delivery = await Delivery.create({
      order: orderId,
      assignedTo,
      disposition,
      paymentAction,
      scheduledAt,
      notes,
      status: 'assigned',
    });

    // Optionally mark order as manifested/shipped
    order.status = 'shipped';
    await order.save();

    res.status(201).json({ message: 'Delivery assigned successfully', delivery });
  } catch (error: any) {
    res.status(500).json({ message: 'Error creating delivery', error: error.message });
  }
};

// 🟨 Get all deliveries
export const getAllDeliveries = async (req: Request, res: Response) => {
  try {
    const { status, assignedTo, page = 1, limit = 20 } = req.query;
    const query: any = {};
    if (status) query.status = status;
    if (assignedTo) query.assignedTo = assignedTo;

    const deliveries = await Delivery.find(query)
      .populate('order', 'status total store')
      .populate('assignedTo', 'name repType')
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 });

    const total = await Delivery.countDocuments(query);
    res.json({ total, page: +page, limit: +limit, deliveries });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching deliveries', error });
  }
};

// 🟦 Get delivery by ID
export const getDeliveryById = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findById(req.params.id)
      .populate('order', 'status total store')
      .populate('assignedTo', 'name repType');
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    res.json(delivery);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching delivery', error });
  }
};

// 🟧 Update delivery status
export const updateDeliveryStatus = async (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    const delivery = await Delivery.findById(req.params.id).populate('order');
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });

    // Transition logic
    if (status === 'in_transit') delivery.pickedAt = new Date();
    if (status === 'completed') {
      delivery.deliveredAt = new Date();
      // auto-update order if needed
      if (delivery.order) {
        await Order.findByIdAndUpdate(delivery.order._id, { status: 'delivered' });
      }
    }

    delivery.status = status;
    await delivery.save();

    res.json({ message: `Delivery marked as ${status}`, delivery });
  } catch (error) {
    res.status(500).json({ message: 'Error updating delivery status', error });
  }
};

// 🟥 Delete delivery
export const deleteDelivery = async (req: Request, res: Response) => {
  try {
    const delivery = await Delivery.findByIdAndDelete(req.params.id);
    if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
    res.json({ message: 'Delivery deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting delivery', error });
  }
};
