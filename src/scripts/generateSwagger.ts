// src/scripts/generateSwagger.ts
// Run with: npx ts-node src/scripts/generateSwagger.ts

import swaggerAutogen from "swagger-autogen";

const doc = {
  info: {
    title: "Better Edibles API",
    version: "1.0.0",
    description:
      "Rep Order System API for managing stores, products, orders, deliveries, and private label operations",
  },
  servers: [
    { url: "http://localhost:5000", description: "Development" },
    { url: "https://staging.better-edibles.com", description: "Staging" },
    { url: "https://www.better-edibles.com", description: "Production" },
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
    { name: "Private Label Products", description: "Private label product types" },
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
      // Rep
      Rep: {
        _id: "507f1f77bcf86cd799439011",
        name: "John Doe",
        loginName: "john_doe",
        email: "john@example.com",
        phone: "555-1234",
        repType: "rep",
        territory: "West Coast",
        pin: "1212",
        assignedStores: ["507f1f77bcf86cd799439012"],
        checkin: false,
        status: "active",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Store
      Store: {
        _id: "507f1f77bcf86cd799439012",
        name: "Green Leaf Dispensary",
        address: "123 Main St",
        city: "Portland",
        state: "OR",
        zip: "97201",
        territory: "West Coast",
        rep: "507f1f77bcf86cd799439011",
        contacts: [],
        blocked: false,
        terms: "Net 30",
        group: "Premium",
        notesCount: 5,
        totalPurchase: 10000,
        totalPaid: 8000,
        dueAmount: 2000,
        paymentStatus: "green",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Product Line
      ProductLine: {
        _id: "507f1f77bcf86cd799439013",
        name: "Cannacrispy",
        displayOrder: 1,
        active: true,
        pricingStructure: {
          type: "multi-type",
          typeLabels: ["hybrid", "indica", "sativa"],
        },
        fields: [],
        description: "Cannabis-infused crispy treats",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Product
      Product: {
        _id: "507f1f77bcf86cd799439014",
        productLine: "507f1f77bcf86cd799439013",
        itemName: "Birthday Cake",
        price: 25,
        discountPrice: 20,
        applyDiscount: false,
        active: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Order
      Order: {
        _id: "507f1f77bcf86cd799439015",
        orderNumber: 1001,
        store: "507f1f77bcf86cd799439012",
        rep: "507f1f77bcf86cd799439011",
        items: [
          {
            product: "507f1f77bcf86cd799439014",
            name: "Birthday Cake",
            unitPrice: 25,
            qty: 10,
            lineTotal: 250,
          },
        ],
        subtotal: 250,
        tax: 0,
        discount: 0,
        total: 250,
        status: "submitted",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Client Order
      ClientOrder: {
        _id: "507f1f77bcf86cd799439016",
        orderNumber: "CO-2024-0001",
        client: "507f1f77bcf86cd799439017",
        assignedRep: "507f1f77bcf86cd799439011",
        status: "waiting",
        deliveryDate: "2024-02-01T00:00:00.000Z",
        productionStartDate: "2024-01-18T00:00:00.000Z",
        items: [],
        subtotal: 500,
        total: 500,
        isRecurring: false,
        shipASAP: false,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Private Label Client
      PrivateLabelClient: {
        _id: "507f1f77bcf86cd799439017",
        store: "507f1f77bcf86cd799439012",
        status: "active",
        contactEmail: "client@example.com",
        assignedRep: "507f1f77bcf86cd799439011",
        recurringSchedule: { enabled: false },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Private Label Product
      PrivateLabelProduct: {
        _id: "507f1f77bcf86cd799439018",
        name: "BIOMAX",
        unitPrice: 150,
        description: "Premium private label product",
        isActive: true,
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Label
      Label: {
        _id: "507f1f77bcf86cd799439019",
        client: "507f1f77bcf86cd799439017",
        flavorName: "Strawberry Bliss",
        productType: "BIOMAX",
        currentStage: "design_in_progress",
        stageHistory: [],
        labelImages: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Delivery
      Delivery: {
        _id: "507f1f77bcf86cd799439020",
        storeId: "507f1f77bcf86cd799439012",
        assignedTo: "507f1f77bcf86cd799439011",
        disposition: "delivery",
        paymentAction: "collect_payment",
        amount: 500,
        scheduledAt: "2024-01-15T10:00:00.000Z",
        status: "pending",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Note
      Note: {
        _id: "507f1f77bcf86cd799439021",
        entityId: "507f1f77bcf86cd799439012",
        author: "507f1f77bcf86cd799439011",
        date: "2024-01-15 14:30",
        disposition: "positive",
        visitType: "sales",
        content: "Great meeting with the owner",
        sample: false,
        delivery: false,
        payment: { cash: false, check: false, noPay: true },
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // TimeLog
      TimeLog: {
        _id: "507f1f77bcf86cd799439022",
        rep: "507f1f77bcf86cd799439011",
        checkinTime: "2024-01-15T08:00:00.000Z",
        checkoutTime: "2024-01-15T17:00:00.000Z",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Sample
      Sample: {
        _id: "507f1f77bcf86cd799439023",
        store: "507f1f77bcf86cd799439012",
        rep: "507f1f77bcf86cd799439011",
        status: "submitted",
        description: "Sample pack",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Contact
      Contact: {
        _id: "507f1f77bcf86cd799439024",
        name: "Jane Smith",
        role: "Manager",
        email: "jane@store.com",
        phone: "555-5678",
        importantToKnow: "Prefers morning calls",
        store: "507f1f77bcf86cd799439012",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Followup
      Followup: {
        _id: "507f1f77bcf86cd799439025",
        followupDate: "2024-01-20",
        interestLevel: "high",
        comments: "Follow up on bulk order",
        store: "507f1f77bcf86cd799439012",
        rep: "507f1f77bcf86cd799439011",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Admin
      Admin: {
        _id: "507f1f77bcf86cd799439026",
        name: "Admin User",
        email: "admin@example.com",
        role: "superadmin",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Private Label Order
      PrivateLabel: {
        _id: "507f1f77bcf86cd799439027",
        orderNumber: 1,
        store: "507f1f77bcf86cd799439012",
        rep: "507f1f77bcf86cd799439011",
        items: [],
        subtotal: 1000,
        total: 1000,
        status: "submitted",
        createdAt: "2024-01-01T00:00:00.000Z",
        updatedAt: "2024-01-01T00:00:00.000Z",
      },
      // Error Response
      Error: {
        message: "Error message",
        error: {},
      },
    },
  },
};

const outputFile = "./src/docs/swagger-output.json";
const endpointsFiles = ["./src/app.ts"];

swaggerAutogen({ openapi: "3.0.0" })(outputFile, endpointsFiles, doc).then(
  (result) => {
    if (result && typeof result === "object" && result.success) {
      console.log("✅ Swagger documentation generated successfully!");
      console.log(`📄 Output: ${outputFile}`);
    } else {
      console.error("❌ Failed to generate Swagger documentation");
    }
  }
);
