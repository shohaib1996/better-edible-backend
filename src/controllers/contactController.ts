import { Request, Response } from "express";
import { Contact } from "../models/Contact";
import { Store } from "../models/Store";

// Get all contacts
export const getAllContacts = async (req: Request, res: Response) => {
  try {
    const { storeId } = req.query;
    const query = storeId ? { store: storeId } : {};
    const contacts = await Contact.find(query).populate("store", "name");
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching contacts", error });
  }
};

// Get contact by ID
export const getContactById = async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findById(req.params.id).populate(
      "store",
      "name"
    );
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: "Error fetching contact", error });
  }
};

// Create contact
// Create contact
export const createContact = async (req: Request, res: Response) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Error creating contact(s)", error });
  }
};

// Update contact
export const updateContact = async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ message: "Error updating contact", error });
  }
};

// Delete contact
export const deleteContact = async (req: Request, res: Response) => {
  try {
    const contact = await Contact.findByIdAndDelete(req.params.id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json({ message: "Contact deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting contact", error });
  }
};
