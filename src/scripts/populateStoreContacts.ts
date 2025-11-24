import * as fs from "fs";
import * as path from "path";

const storesPath = path.join(__dirname, "../../better-edibles.stores.json");
const contactsPath = path.join(__dirname, "../../better-edibles.contacts.json");
const outputPath = path.join(__dirname, "../../stores_with_contacts.json");

try {
  console.log("Reading files...");
  const storesRaw = fs.readFileSync(storesPath, "utf-8");
  const contactsRaw = fs.readFileSync(contactsPath, "utf-8");

  const stores = JSON.parse(storesRaw);
  const contacts = JSON.parse(contactsRaw);

  console.log(
    `Loaded ${stores.length} stores and ${contacts.length} contacts.`
  );

  // Group contacts by store ID
  const contactsByStore: { [key: string]: any[] } = {};

  contacts.forEach((contact: any) => {
    // The store field in contact is an object with $oid
    const storeId = contact.store?.$oid;

    if (storeId) {
      if (!contactsByStore[storeId]) {
        contactsByStore[storeId] = [];
      }
      // We push the contact ID in MongoDB Extended JSON format
      contactsByStore[storeId].push({ $oid: contact._id.$oid });
    }
  });

  let matchedCount = 0;

  // Update stores with their contacts
  const updatedStores = stores.map((store: any) => {
    const storeId = store._id.$oid;
    const storeContacts = contactsByStore[storeId] || [];

    if (storeContacts.length > 0) {
      matchedCount++;
    }

    return {
      ...store,
      contacts: storeContacts,
    };
  });

  fs.writeFileSync(outputPath, JSON.stringify(updatedStores, null, 2));

  console.log("------------------------------------------------");
  console.log(`Finished processing.`);
  console.log(`Stores with contacts: ${matchedCount}`);
  console.log(`Output saved to: ${outputPath}`);
} catch (error) {
  console.error("Error processing files:", error);
}
