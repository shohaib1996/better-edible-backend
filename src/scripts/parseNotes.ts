import * as fs from "fs";
import * as path from "path";
import { JSDOM } from "jsdom";

const htmlPath = path.join(__dirname, "../../Reps_Daily Contact Sheet.html");
const outputPath = path.join(__dirname, "../../notes.json");

// Simple ObjectId generator (24 hex characters)
function generateObjectId(): string {
  const timestamp = Math.floor(Date.now() / 1000)
    .toString(16)
    .padStart(8, "0");
  const randomValue = Math.random()
    .toString(16)
    .substring(2, 18)
    .padStart(16, "0");
  return timestamp + randomValue;
}

// Convert date string to ISO format
function convertToISODate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toISOString();
}

try {
  // Read HTML file
  const htmlContent = fs.readFileSync(htmlPath, "utf-8");

  // Parse HTML
  const dom = new JSDOM(htmlContent);
  const document = dom.window.document;

  // Extract store name and ID from the page
  const storeHeader = document.querySelector(".module-head h3");
  const storeText = storeHeader?.textContent || "";

  // Use the provided MongoDB ObjectId for the store
  const storeObjectId = "6925ae582137cbce35905bd4";
  const authorObjectId = "692421070e46984ac310858a";

  console.log(`Extracting notes for store: ${storeText.trim()}`);
  console.log(`Store ObjectId: ${storeObjectId}`);
  console.log(`Author ObjectId: ${authorObjectId}`);

  // Get all table rows containing notes
  const rows = document.querySelectorAll("tbody tr");
  const notes: any[] = [];

  rows.forEach((row) => {
    const cellContent = row.querySelector("td")?.innerHTML || "";

    // Extract date
    const dateMatch = cellContent.match(/<strong>Date\s*:\s*<\/strong>([^<]+)/);
    const dateStr = dateMatch ? dateMatch[1].trim() : "";

    // Extract disposition
    const dispositionMatch = cellContent.match(
      /<strong>Disposition\s*:\s*<\/strong>([^<&]+)/
    );
    const disposition = dispositionMatch ? dispositionMatch[1].trim() : "";

    // Extract visit type (contains payment info)
    const visitTypeMatch = cellContent.match(
      /<strong>Visit Type\s*:\s*<\/strong>([^<]+)/
    );
    const visitType = visitTypeMatch ? visitTypeMatch[1].trim() : "";

    // Extract notes content
    const notesMatch = cellContent.match(/<strong>Notes<\/strong>:\s*([^<]+)/);
    const content = notesMatch ? notesMatch[1].trim() : "";

    // Extract delivery note
    const deliveryNoteMatch = cellContent.match(
      /<strong>Delivery Note<\/strong>:\s*([^<]+)/
    );
    const deliveryNote = deliveryNoteMatch ? deliveryNoteMatch[1].trim() : "";

    // Parse visit type for payment and delivery info
    const payment: any = {
      cash: false,
      check: false,
      noPay: false,
      amount: "",
    };

    let sample = false;
    let delivery = false;

    if (visitType) {
      // Check for payment types
      if (/cash/i.test(visitType)) {
        payment.cash = true;
      }
      if (/check/i.test(visitType)) {
        payment.check = true;
      }
      if (/no\s*payment/i.test(visitType)) {
        payment.noPay = true;
      }

      // Extract payment amount
      const amountMatch = visitType.match(/Payment-\$?([\d,.]+)/i);
      if (amountMatch) {
        payment.amount = amountMatch[1];
      }

      // Check for delivery and sample
      if (/delivery/i.test(visitType)) {
        delivery = true;
      }
      if (/sample/i.test(visitType)) {
        sample = true;
      }
    }

    // Also check disposition for delivery and sample
    if (/delivery/i.test(disposition)) {
      delivery = true;
    }
    if (/sample/i.test(disposition)) {
      sample = true;
    }

    // Create note object matching the Note model with MongoDB format
    const noteObj: any = {
      entityId: {
        $oid: storeObjectId,
      },
      author: {
        $oid: authorObjectId,
      },
      date: dateStr ? convertToISODate(dateStr) : new Date().toISOString(),
      sample,
      delivery,
    };

    // Add optional fields only if they have values
    if (disposition) {
      noteObj.disposition = disposition;
    }
    if (visitType) {
      noteObj.visitType = visitType;
    }
    if (content || deliveryNote) {
      noteObj.content = content || deliveryNote;
    }

    // Add payment object if it has any values
    if (payment.cash || payment.check || payment.noPay || payment.amount) {
      noteObj.payment = payment;
    }

    // Only add note if it has a valid date
    if (dateStr) {
      notes.push(noteObj);
    }
  });

  // Write to JSON file
  fs.writeFileSync(outputPath, JSON.stringify(notes, null, 2));
  console.log(`\nSuccessfully extracted ${notes.length} notes to notes.json`);
  console.log(`\nAll notes are ready for MongoDB import:`);
  console.log(`1. entityId is set to: ${storeObjectId}`);
  console.log(`2. author is set to: ${authorObjectId}`);
  console.log(`3. Dates are in ISO format`);
  console.log(`4. MongoDB will auto-generate _id when documents are inserted`);
} catch (error) {
  console.error("Error processing HTML file:", error);
}
