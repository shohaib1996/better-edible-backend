// src/controllers/productController.ts
import { Request, Response } from 'express';
import { Product } from '../models/Product';

// Get all products (with search, pagination, filtering)
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const { search, active, page = 1, limit = 20 } = req.query;
    const query: any = {};

    if (search) query.$text = { $search: search as string };
    if (active !== undefined) query.active = active === 'true';

    const products = await Product.find(query)
      .skip((+page - 1) * +limit)
      .limit(+limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);
    res.json({ total, page: +page, limit: +limit, products });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching products', error });
  }
};

// Get one product
export const getProductById = async (req: Request, res: Response) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching product', error });
  }
};

// Create product
export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, productLine, subProductLine, sku, description, priceTiers, metadata } = req.body;

    const existing = await Product.findOne({ name });
    if (existing) return res.status(400).json({ message: 'Product name already exists' });

    const product = await Product.create({
      name,
      productLine,
      subProductLine,
      sku,
      description,
      priceTiers,
      metadata,
    });

    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error creating product', error });
  }
};

// Update product
export const updateProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: 'Error updating product', error });
  }
};

// Toggle product active/inactive
export const toggleProductStatus = async (req: Request, res: Response) => {
  try {
    const { active } = req.body;
    const product = await Product.findByIdAndUpdate(req.params.id, { active }, { new: true });
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: `Product ${active ? 'activated' : 'deactivated'}`, product });
  } catch (error) {
    res.status(500).json({ message: 'Error updating product status', error });
  }
};

// Delete product
export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product', error });
  }
};
