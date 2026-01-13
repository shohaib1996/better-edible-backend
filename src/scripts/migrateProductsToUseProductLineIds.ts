// Script to migrate existing products to use ProductLine ObjectIds instead of hardcoded strings
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { Product } from '../models/Product';
import { ProductLine } from '../models/ProductLine';

dotenv.config();

const migrateProductsToUseProductLineIds = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI not found in environment variables');
    }

    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');

    // Step 1: Fetch all ProductLines
    const productLines = await ProductLine.find({});
    console.log(`\n📦 Found ${productLines.length} Product Lines:`);

    const productLineMap: Record<string, string> = {};
    productLines.forEach((pl) => {
      productLineMap[pl.name] = pl._id.toString();
      console.log(`  - ${pl.name}: ${pl._id}`);
    });

    if (productLines.length === 0) {
      console.log('\n⚠️  No ProductLines found. Please run the migration script to create ProductLines first:');
      console.log('   npm run migrate:product-lines');
      process.exit(1);
    }

    // Step 2: Fetch all products
    const products = await Product.find({});
    console.log(`\n📦 Found ${products.length} Products to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    // Step 3: Update each product
    for (const product of products) {
      const currentProductLine = product.productLine;

      // Check if already an ObjectId
      if (mongoose.Types.ObjectId.isValid(currentProductLine as string) &&
          String(currentProductLine).length === 24) {
        console.log(`⏭️  Skipping ${product._id} - already using ObjectId`);
        skippedCount++;
        continue;
      }

      // Find matching ProductLine ID
      const productLineId = productLineMap[currentProductLine as string];

      if (!productLineId) {
        console.log(`❌ Product ${product._id} has unknown productLine: "${currentProductLine}"`);
        errorCount++;
        continue;
      }

      // Update the product
      product.productLine = new mongoose.Types.ObjectId(productLineId) as any;
      await product.save();

      console.log(`✅ Migrated ${product._id}: "${currentProductLine}" → ${productLineId}`);
      migratedCount++;
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`  ✅ Migrated: ${migratedCount}`);
    console.log(`  ⏭️  Skipped (already migrated): ${skippedCount}`);
    console.log(`  ❌ Errors: ${errorCount}`);
    console.log(`\n🎉 Migration completed!`);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
  }
};

migrateProductsToUseProductLineIds();
