// src/config/swagger.ts
import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Better Edibles API",
      version: "1.0.0",
      description:
        "Rep Order System API for managing stores, products, orders, deliveries, and private label operations",
      contact: {
        name: "API Support",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
      {
        url: "https://staging.better-edibles.com",
        description: "Staging server",
      },
      {
        url: "https://www.better-edibles.com",
        description: "Production server",
      },
    ],
    tags: [
      { name: "Auth", description: "Authentication endpoints for reps" },
      { name: "Admin", description: "Admin authentication endpoints" },
      { name: "Reps", description: "Sales representative management" },
      { name: "Stores", description: "Store management" },
      { name: "Products", description: "Product catalog management" },
      { name: "Product Lines", description: "Product line configuration" },
      { name: "Orders", description: "Customer order management" },
      { name: "Client Orders", description: "Private label client orders" },
      { name: "Private Labels", description: "Private label order management" },
      {
        name: "Private Label Products",
        description: "Private label product types",
      },
      { name: "Private Label Clients", description: "Private label clients" },
      { name: "Labels", description: "Label design and approval workflow" },
      { name: "Deliveries", description: "Delivery scheduling and tracking" },
      { name: "Notes", description: "Store visit notes" },
      { name: "Time Logs", description: "Rep time tracking" },
      { name: "Samples", description: "Sample management" },
      { name: "Contacts", description: "Store contacts" },
      { name: "Followups", description: "Sales follow-ups" },
    ],
    components: {
      schemas: {
        // ===== AUTH =====
        LoginRequest: {
          type: "object",
          required: ["loginName", "password"],
          properties: {
            loginName: { type: "string", example: "john_doe" },
            password: { type: "string", example: "password123" },
          },
        },
        RegisterRequest: {
          type: "object",
          required: ["name", "loginName", "password"],
          properties: {
            name: { type: "string", example: "John Doe" },
            loginName: { type: "string", example: "john_doe" },
            password: { type: "string", example: "password123" },
            email: { type: "string", example: "john@example.com" },
            phone: { type: "string", example: "555-1234" },
            repType: {
              type: "string",
              enum: ["rep", "delivery", "both"],
              default: "rep",
            },
            territory: { type: "string", example: "West Coast" },
          },
        },

        // ===== REP =====
        Rep: {
          type: "object",
          properties: {
            _id: { type: "string", example: "507f1f77bcf86cd799439011" },
            name: { type: "string", example: "John Doe" },
            loginName: { type: "string", example: "john_doe" },
            email: { type: "string", example: "john@example.com" },
            phone: { type: "string", example: "555-1234" },
            repType: {
              type: "string",
              enum: ["rep", "delivery", "both"],
            },
            territory: { type: "string", example: "West Coast" },
            pin: { type: "string", example: "1212" },
            assignedStores: {
              type: "array",
              items: { type: "string" },
            },
            checkin: { type: "boolean", default: false },
            status: {
              type: "string",
              enum: ["active", "inactive", "suspended"],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CheckInRequest: {
          type: "object",
          required: ["repId", "pin"],
          properties: {
            repId: { type: "string", example: "507f1f77bcf86cd799439011" },
            pin: { type: "string", example: "1212" },
          },
        },

        // ===== STORE =====
        Store: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Green Leaf Dispensary" },
            address: { type: "string", example: "123 Main St" },
            city: { type: "string", example: "Portland" },
            state: { type: "string", example: "OR" },
            zip: { type: "string", example: "97201" },
            territory: { type: "string", example: "West Coast" },
            rep: { type: "string", description: "Rep ObjectId" },
            contacts: {
              type: "array",
              items: { type: "string" },
              description: "Contact ObjectIds",
            },
            blocked: { type: "boolean", default: false },
            terms: { type: "string" },
            group: { type: "string" },
            notesCount: { type: "number", default: 0 },
            lastOrderAt: { type: "string", format: "date-time" },
            totalPurchase: { type: "number", default: 0 },
            totalPaid: { type: "number", default: 0 },
            dueAmount: { type: "number", default: 0 },
            lastPaidAt: { type: "string", format: "date-time" },
            paymentStatus: {
              type: "string",
              enum: ["green", "yellow", "red"],
              description:
                "Auto-calculated: green (paid within 7 days), yellow (within 30 days), red (over 30 days)",
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateStoreRequest: {
          type: "object",
          required: ["name"],
          properties: {
            name: { type: "string", example: "Green Leaf Dispensary" },
            address: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            zip: { type: "string" },
            territory: { type: "string" },
            rep: { type: "string", description: "Rep ObjectId" },
            terms: { type: "string" },
            group: { type: "string" },
          },
        },

        // ===== PRODUCT LINE =====
        ProductLine: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "Cannacrispy" },
            displayOrder: { type: "number", default: 0 },
            active: { type: "boolean", default: true },
            pricingStructure: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["simple", "variants", "multi-type"],
                },
                variantLabels: {
                  type: "array",
                  items: { type: "string" },
                  example: ["50mg", "100mg", "200mg"],
                },
                typeLabels: {
                  type: "array",
                  items: { type: "string" },
                  example: ["hybrid", "indica", "sativa"],
                },
              },
            },
            fields: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  label: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["text", "number", "select", "textarea"],
                  },
                  placeholder: { type: "string" },
                  required: { type: "boolean" },
                  options: { type: "array", items: { type: "string" } },
                },
              },
            },
            description: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== PRODUCT =====
        Product: {
          type: "object",
          properties: {
            _id: { type: "string" },
            productLine: { type: "string", description: "ProductLine ObjectId" },
            subProductLine: { type: "string" },
            itemName: { type: "string", example: "Birthday Cake" },
            hybridBreakdown: {
              type: "object",
              properties: {
                hybrid: { type: "number" },
                indica: { type: "number" },
                sativa: { type: "number" },
              },
            },
            prices: {
              type: "object",
              description: "For multi-type pricing",
              properties: {
                hybrid: {
                  type: "object",
                  properties: {
                    price: { type: "number" },
                    discountPrice: { type: "number" },
                  },
                },
                indica: {
                  type: "object",
                  properties: {
                    price: { type: "number" },
                    discountPrice: { type: "number" },
                  },
                },
                sativa: {
                  type: "object",
                  properties: {
                    price: { type: "number" },
                    discountPrice: { type: "number" },
                  },
                },
              },
            },
            price: { type: "number", description: "For simple pricing" },
            discountPrice: { type: "number" },
            variants: {
              type: "array",
              description: "For variant pricing",
              items: {
                type: "object",
                properties: {
                  label: { type: "string", example: "100mg" },
                  price: { type: "number", example: 25 },
                  discountPrice: { type: "number", example: 20 },
                },
              },
            },
            priceDescription: { type: "string" },
            discountDescription: { type: "string" },
            applyDiscount: { type: "boolean", default: false },
            active: { type: "boolean", default: true },
            metadata: { type: "object" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateProductRequest: {
          type: "object",
          required: ["productLine"],
          properties: {
            productLine: { type: "string", description: "ProductLine ObjectId" },
            itemName: { type: "string" },
            price: { type: "number" },
            discountPrice: { type: "number" },
            variants: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  price: { type: "number" },
                  discountPrice: { type: "number" },
                },
              },
            },
            prices: { type: "object" },
            applyDiscount: { type: "boolean" },
          },
        },

        // ===== ORDER =====
        OrderItem: {
          type: "object",
          properties: {
            product: { type: "string", description: "Product ObjectId" },
            name: { type: "string" },
            unitLabel: { type: "string" },
            unitPrice: { type: "number" },
            discountPrice: { type: "number" },
            qty: { type: "number" },
            lineTotal: { type: "number" },
            appliedDiscount: { type: "boolean" },
          },
        },
        Order: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: {
              type: "number",
              description: "Auto-incremented order number",
            },
            store: { type: "string", description: "Store ObjectId" },
            rep: { type: "string", description: "Rep ObjectId" },
            items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
            subtotal: { type: "number" },
            tax: { type: "number", default: 0 },
            discount: { type: "number", default: 0 },
            total: { type: "number" },
            payment: {
              type: "object",
              properties: {
                method: {
                  type: "string",
                  enum: ["cash", "card", "bank", "stripe"],
                },
                amount: { type: "number" },
                collected: { type: "boolean" },
                collectedBy: { type: "string" },
                collectedAt: { type: "string", format: "date-time" },
                note: { type: "string" },
              },
            },
            status: {
              type: "string",
              enum: [
                "submitted",
                "accepted",
                "manifested",
                "shipped",
                "delivered",
                "cancelled",
                "returned",
              ],
            },
            note: { type: "string" },
            deliveryDate: {
              type: "string",
              description: "ISO date: YYYY-MM-DD",
            },
            shippedDate: { type: "string", description: "ISO date: YYYY-MM-DD" },
            dueDate: { type: "string", description: "ISO date: YYYY-MM-DD" },
            discountType: { type: "string", enum: ["flat", "percent"] },
            discountValue: { type: "number" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },
        CreateOrderRequest: {
          type: "object",
          required: ["store", "rep", "items"],
          properties: {
            store: { type: "string" },
            rep: { type: "string" },
            items: { type: "array", items: { $ref: "#/components/schemas/OrderItem" } },
            tax: { type: "number" },
            discountType: { type: "string", enum: ["flat", "percent"] },
            discountValue: { type: "number" },
            note: { type: "string" },
            deliveryDate: { type: "string" },
            dueDate: { type: "string" },
          },
        },

        // ===== CLIENT ORDER =====
        ClientOrderItem: {
          type: "object",
          properties: {
            label: { type: "string", description: "Label ObjectId" },
            flavorName: { type: "string" },
            productType: { type: "string" },
            quantity: { type: "number", minimum: 1 },
            unitPrice: { type: "number" },
            lineTotal: { type: "number" },
          },
        },
        ClientOrder: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: {
              type: "string",
              description: "Format: CO-YYYY-XXXX",
            },
            client: {
              type: "string",
              description: "PrivateLabelClient ObjectId",
            },
            assignedRep: { type: "string", description: "Rep ObjectId" },
            status: {
              type: "string",
              enum: [
                "waiting",
                "stage_1",
                "stage_2",
                "stage_3",
                "stage_4",
                "ready_to_ship",
                "shipped",
              ],
            },
            deliveryDate: { type: "string", format: "date-time" },
            productionStartDate: {
              type: "string",
              format: "date-time",
              description: "Auto-calculated: 2 weeks before delivery",
            },
            actualShipDate: { type: "string", format: "date-time" },
            items: {
              type: "array",
              items: { $ref: "#/components/schemas/ClientOrderItem" },
            },
            subtotal: { type: "number" },
            discount: { type: "number" },
            discountType: { type: "string", enum: ["flat", "percentage"] },
            discountAmount: { type: "number" },
            total: { type: "number" },
            note: { type: "string" },
            isRecurring: { type: "boolean" },
            parentOrder: { type: "string" },
            shipASAP: { type: "boolean" },
            emailsSent: {
              type: "object",
              properties: {
                sevenDayReminder: { type: "boolean" },
                readyToShipNotification: { type: "boolean" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== PRIVATE LABEL =====
        PrivateLabel: {
          type: "object",
          properties: {
            _id: { type: "string" },
            orderNumber: { type: "number" },
            store: { type: "string" },
            rep: { type: "string" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  privateLabelType: { type: "string" },
                  flavor: { type: "string" },
                  quantity: { type: "number" },
                  unitPrice: { type: "number" },
                  lineTotal: { type: "number" },
                  labelImages: { type: "array", items: { type: "object" } },
                },
              },
            },
            subtotal: { type: "number" },
            discount: { type: "number" },
            discountType: { type: "string", enum: ["flat", "percentage"] },
            discountAmount: { type: "number" },
            total: { type: "number" },
            status: {
              type: "string",
              enum: [
                "submitted",
                "accepted",
                "manifested",
                "shipped",
                "cancelled",
              ],
            },
            note: { type: "string" },
            deliveryDate: { type: "string" },
            shippedDate: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== PRIVATE LABEL CLIENT =====
        PrivateLabelClient: {
          type: "object",
          properties: {
            _id: { type: "string" },
            store: { type: "string", description: "Store ObjectId" },
            status: { type: "string", enum: ["onboarding", "active"] },
            contactEmail: { type: "string" },
            assignedRep: { type: "string" },
            recurringSchedule: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                interval: {
                  type: "string",
                  enum: ["monthly", "bimonthly", "quarterly"],
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== PRIVATE LABEL PRODUCT =====
        PrivateLabelProduct: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string", example: "BIOMAX" },
            unitPrice: { type: "number", example: 150 },
            description: { type: "string" },
            isActive: { type: "boolean", default: true },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== LABEL =====
        Label: {
          type: "object",
          properties: {
            _id: { type: "string" },
            client: { type: "string", description: "PrivateLabelClient ObjectId" },
            flavorName: { type: "string", example: "Strawberry Bliss" },
            productType: { type: "string", example: "BIOMAX" },
            currentStage: {
              type: "string",
              enum: [
                "design_in_progress",
                "awaiting_store_approval",
                "store_approved",
                "submitted_to_olcc",
                "olcc_approved",
                "print_order_submitted",
                "ready_for_production",
              ],
            },
            stageHistory: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  stage: { type: "string" },
                  changedBy: { type: "string" },
                  changedAt: { type: "string", format: "date-time" },
                  notes: { type: "string" },
                },
              },
            },
            labelImages: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  secureUrl: { type: "string" },
                  publicId: { type: "string" },
                  format: { type: "string" },
                  bytes: { type: "number" },
                  originalFilename: { type: "string" },
                  uploadedAt: { type: "string", format: "date-time" },
                },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== DELIVERY =====
        Delivery: {
          type: "object",
          properties: {
            _id: { type: "string" },
            storeId: { type: "string" },
            assignedTo: { type: "string" },
            sampleId: { type: "string" },
            orderId: { type: "string" },
            privateLabelOrderId: { type: "string" },
            disposition: {
              type: "string",
              enum: ["money_pickup", "delivery", "sample_drop", "other"],
            },
            paymentAction: {
              type: "string",
              enum: ["collect_payment", "no_payment", "may_not_collect"],
            },
            amount: { type: "number" },
            scheduledAt: { type: "string", format: "date-time" },
            notes: { type: "string" },
            status: {
              type: "string",
              enum: [
                "pending",
                "assigned",
                "completed",
                "cancelled",
                "in_transit",
              ],
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== NOTE =====
        Note: {
          type: "object",
          properties: {
            _id: { type: "string" },
            entityId: { type: "string", description: "Store ObjectId" },
            author: { type: "string", description: "Rep ObjectId" },
            date: {
              type: "string",
              description: "Format: YYYY-MM-DD HH:MM (24hr)",
              example: "2026-01-12 14:30",
            },
            disposition: { type: "string" },
            visitType: { type: "string" },
            content: { type: "string" },
            sample: { type: "boolean" },
            delivery: { type: "boolean" },
            payment: {
              type: "object",
              properties: {
                cash: { type: "boolean" },
                check: { type: "boolean" },
                noPay: { type: "boolean" },
                amount: { type: "string" },
              },
            },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== TIME LOG =====
        TimeLog: {
          type: "object",
          properties: {
            _id: { type: "string" },
            rep: { type: "string" },
            checkinTime: { type: "string", format: "date-time" },
            checkoutTime: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== SAMPLE =====
        Sample: {
          type: "object",
          properties: {
            _id: { type: "string" },
            store: { type: "string" },
            rep: { type: "string" },
            status: {
              type: "string",
              enum: [
                "submitted",
                "accepted",
                "manifested",
                "shipped",
                "cancelled",
              ],
            },
            description: { type: "string" },
            notes: { type: "string" },
            deliveryDate: { type: "string", format: "date-time" },
            shippedDate: { type: "string", format: "date-time" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== CONTACT =====
        Contact: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            role: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            importantToKnow: { type: "string" },
            store: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== FOLLOWUP =====
        Followup: {
          type: "object",
          properties: {
            _id: { type: "string" },
            followupDate: {
              type: "string",
              description: "Format: YYYY-MM-DD",
              example: "2026-01-15",
            },
            interestLevel: { type: "string" },
            comments: { type: "string" },
            store: { type: "string" },
            rep: { type: "string" },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== ADMIN =====
        Admin: {
          type: "object",
          properties: {
            _id: { type: "string" },
            name: { type: "string" },
            email: { type: "string" },
            role: { type: "string", enum: ["superadmin", "manager"] },
            createdAt: { type: "string", format: "date-time" },
            updatedAt: { type: "string", format: "date-time" },
          },
        },

        // ===== ERROR RESPONSE =====
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            error: { type: "object" },
          },
        },
      },
    },
  },
  apis: ["./src/docs/*.yaml"],
};

export const swaggerSpec = swaggerJsdoc(options);
