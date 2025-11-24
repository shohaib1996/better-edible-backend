import * as fs from "fs";
import * as path from "path";

const contactsPath = path.join(__dirname, "../../contacts.json");
// The exported file from MongoDB
const storesDbPath = path.join(__dirname, "../../better-edibles.stores.json");
const outputContactsPath = path.join(__dirname, "../../contacts_linked.json");

try {
  // Read contacts
  const contactsRaw = fs.readFileSync(contactsPath, "utf-8");
  const contacts = JSON.parse(contactsRaw);

  // Read stores from DB export
  const storesRaw = fs.readFileSync(storesDbPath, "utf-8");
  const stores = JSON.parse(storesRaw);

  const linkedContacts: any[] = [];
  let matchCount = 0;
  let missCount = 0;

  console.log(`Processing ${contacts.length} contacts...`);

  contacts.forEach((contact: any) => {
    const storeName = contact.storeName;

    // Find matching store by name
    // The export format has _id as { "$oid": "..." }
    const matchedStore = stores.find((s: any) => s.name === storeName);

    if (matchedStore) {
      const storeId = matchedStore._id.$oid;

      // Create new contact object
      const newContact = {
        name: contact.name,
        role: contact.role,
        email: contact.email,
        phone: contact.phone,
        importantToKnow: contact.notes, // Rename notes to importantToKnow
        store: storeId, // Link to store ObjectId
      };

      linkedContacts.push(newContact);
      matchCount++;
    } else {
      console.warn(
        `No matching store found for contact: ${contact.name} (Store: ${storeName})`
      );
      missCount++;
    }
  });

  // Write the linked contacts to a new file
  fs.writeFileSync(outputContactsPath, JSON.stringify(linkedContacts, null, 2));

  console.log("------------------------------------------------");
  console.log(`Finished processing.`);
  console.log(`Total Contacts: ${contacts.length}`);
  console.log(`Linked: ${matchCount}`);
  console.log(`Missed: ${missCount}`);
  console.log(`Output saved to: ${outputContactsPath}`);
} catch (error) {
  console.error("Error processing files:", error);
}
