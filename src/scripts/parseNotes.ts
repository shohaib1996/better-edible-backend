import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";
import mongoose from "mongoose";
import { connectDB } from "../config/db";
import { Note } from "../models/Note";
import dotenv from "dotenv";

dotenv.config();

// USAGE: ts-node src/scripts/parseNotes.ts <storeId> <authorId> <htmlFilePath>
// Example: ts-node src/scripts/parseNotes.ts 692452b64af7d6b4bed7ca3b 692421070e46984ac310858a "Reps_Daily Contact Sheet.html"

const main = async () => {
  try {
    // Hardcoded values for store and author IDs, and HTML file name
    const storeId = "692452b64af7d6b4bed7cc85"; // Use your desired store ObjectId
    const authorId = "692421070e46984ac310858a"; // Use your desired author ObjectId 692421070e46984ac310858a 6913775ecbb69fc48859edbf
    const htmlFileName = "Reps_Daily Contact Sheet.html";

    const htmlPath = path.join(__dirname, "../../", htmlFileName);
    if (!fs.existsSync(htmlPath)) {
      console.error(`❌ HTML file not found at path: ${htmlPath}`);
      process.exit(1);
    }

    // --- 2. Connect to Database ---
    console.log("⚙️ Connecting to database...");
    await connectDB();
    console.log("✅ Database connected.");

    // --- 3. Parse HTML File ---
    console.log(`📄 Parsing HTML file: ${htmlFileName}`);
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");
    const dom = new JSDOM(htmlContent);
    const document = dom.window.document;

    const storeHeader = document.querySelector(".module-head h3");
    const storeText = storeHeader?.textContent || "Unknown Store";
    console.log(`🏢 Parsing notes for store: ${storeText.trim()}`);
    console.log(`Store ID: ${storeId}`);
    console.log(`Author ID: ${authorId}`);

    const rows = document.querySelectorAll("tbody tr");
    const notesToCreate: any[] = [];

    rows.forEach((row) => {
      const cellContent = row.querySelector("td")?.innerHTML || "";

      // --- Extraction Logic (from original script) ---
      const dateMatch = cellContent.match(
        /<strong>Date\s*:\s*<\/strong>([^<]+)/
      );
      const dateStr = dateMatch ? dateMatch[1].trim() : "";
      if (!dateStr) return; // Skip if no date

      const dispositionMatch = cellContent.match(
        /<strong>Disposition\s*:\s*<\/strong>([^<&]+)/
      );
      const disposition = dispositionMatch ? dispositionMatch[1].trim() : "";

      const visitTypeMatch = cellContent.match(
        /<strong>Visit Type\s*:\s*<\/strong>([^<]+)/
      );
      const visitType = visitTypeMatch ? visitTypeMatch[1].trim() : "";

      const notesMatch = cellContent.match(
        /<strong>Notes<\/strong>:\s*([^<]+)/
      );
      const content = notesMatch ? notesMatch[1].trim() : "";

      const deliveryNoteMatch = cellContent.match(
        /<strong>Delivery Note<\/strong>:\s*([^<]+)/
      );
      const deliveryNote = deliveryNoteMatch ? deliveryNoteMatch[1].trim() : "";

      const payment: any = {
        cash: false,
        check: false,
        noPay: false,
        amount: "",
      };
      let sample = false;
      let delivery = false;

      if (visitType) {
        if (/cash/i.test(visitType)) payment.cash = true;
        if (/check/i.test(visitType)) payment.check = true;
        if (/no\s*payment/i.test(visitType)) payment.noPay = true;
        const amountMatch = visitType.match(/Payment-\$?([\d,.]+)/i);
        if (amountMatch) payment.amount = amountMatch[1];
        if (/delivery/i.test(visitType)) delivery = true;
        if (/sample/i.test(visitType)) sample = true;
      }

      if (/delivery/i.test(disposition)) delivery = true;
      if (/sample/i.test(disposition)) sample = true;

      const noteObj: any = {
        entityId: storeId,
        author: authorId,
        date: new Date(dateStr),
        sample,
        delivery,
      };

      if (disposition) noteObj.disposition = disposition;
      if (visitType) noteObj.visitType = visitType;
      if (content || deliveryNote) noteObj.content = content || deliveryNote;
      if (payment.cash || payment.check || payment.noPay || payment.amount) {
        noteObj.payment = payment;
      }

      notesToCreate.push(noteObj);
    });

    console.log(`📊 Found ${notesToCreate.length} notes to create.`);

    // --- 4. Insert Notes into Database ---
    if (notesToCreate.length > 0) {
      console.log("⚙️ Inserting notes into the database...");
      await Note.insertMany(notesToCreate);
      console.log(`✅ Successfully inserted ${notesToCreate.length} notes.`);
    } else {
      console.log("ℹ️ No notes found to insert.");
    }
  } catch (error) {
    console.error("❌ An error occurred during the script execution:", error);
  } finally {
    // --- 5. Disconnect from Database ---
    await mongoose.connection.close();
    console.log("🚪 Database connection closed.");
    process.exit(0);
  }
};

main();
