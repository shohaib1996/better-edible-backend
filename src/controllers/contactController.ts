import { Contact } from "../models/Contact";
import { Store } from "../models/Store";
import { asyncHandler } from "../utils/asyncHandler";
import { AppError } from "../utils/AppError";

// Get all contacts
export const getAllContacts = asyncHandler(async (req, res) => {
  const { storeId } = req.query;
  const query = storeId ? { store: storeId } : {};
  const contacts = await Contact.find(query).populate("store", "name");
  res.json(contacts);
});

// Get contact by ID
export const getContactById = asyncHandler(async (req, res) => {
  const contact = await Contact.findById(req.params.id).populate("store", "name");
  if (!contact) throw new AppError("Contact not found", 404);
  res.json(contact);
});

// Create contact
export const createContact = asyncHandler(async (req, res) => {
  const data = req.body;

  if (Array.isArray(data)) {
    // Handle multiple contacts bulk creation
    const newContacts = await Contact.insertMany(data);

    // Update each store's contacts array
    for (const contact of newContacts) {
      if (contact.store) {
        await Store.findByIdAndUpdate(contact.store, {
          $addToSet: { contacts: contact._id },
        });
      }
    }

    return res.status(201).json(newContacts);
  }

  // Single contact case
  const { name, role, email, phone, importantToKnow, store } = data;

  const newContact = await Contact.create({
    name,
    role,
    email,
    phone,
    importantToKnow,
    store,
  });

  // ⬅️ Push into store.contacts array
  if (store) {
    await Store.findByIdAndUpdate(store, {
      $addToSet: { contacts: newContact._id },
    });
  }

  res.status(201).json(newContact);
});

// Update contact
export const updateContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
  });
  if (!contact) throw new AppError("Contact not found", 404);
  res.json(contact);
});

// Delete contact
export const deleteContact = asyncHandler(async (req, res) => {
  const contact = await Contact.findByIdAndDelete(req.params.id);
  if (!contact) throw new AppError("Contact not found", 404);
  res.json({ message: "Contact deleted successfully" });
});
