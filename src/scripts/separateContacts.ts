import * as fs from "fs";
import * as path from "path";

const storesPath = path.join(__dirname, "../../stores.json");
const contactsPath = path.join(__dirname, "../../contacts.json");

try {
  const rawData = fs.readFileSync(storesPath, "utf-8");
  const stores = JSON.parse(rawData);

  const contacts: any[] = [];
  const cleanedStores: any[] = [];

  stores.forEach((store: any) => {
    // Prepare contact object
    // If contact exists, use it. If not, create empty object if we have notes.
    if (store.contact || store.notes) {
      const contact = {
        ...(store.contact || {}),
        notes: store.notes, // User requested "note" in contacts.json
        storeName: store.name,
      };
      contacts.push(contact);
    }

    // Create cleaned store object (remove id, contact, notes)
    const { id, contact, notes, ...cleanedStore } = store;
    cleanedStores.push(cleanedStore);
  });

  // Write contacts.json
  fs.writeFileSync(contactsPath, JSON.stringify(contacts, null, 2));
  console.log(
    `Successfully extracted ${contacts.length} contacts to contacts.json`
  );

  // Overwrite stores.json
  fs.writeFileSync(storesPath, JSON.stringify(cleanedStores, null, 2));
  console.log(
    `Successfully cleaned ${cleanedStores.length} stores in stores.json`
  );
} catch (error) {
  console.error("Error processing files:", error);
}
