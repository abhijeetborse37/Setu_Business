-- Postgres Migration Script for Setu Business Suite

-- Enums (using check constraints instead of actual Postgres enums for simplicity)
-- Roles: SuperAdmin, Admin, Manager, Accountant
-- BusinessTypes: PrivateLimited, PublicLimited, Proprietorship, Partnership, Ngo
-- CustomerGroups: Regular, Vip, New

CREATE TABLE IF NOT EXISTS "SubscriptionPlans" (
    "Id" UUID PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Description" TEXT,
    "Price" DECIMAL NOT NULL,
    "Validity" TEXT NOT NULL, -- Monthly, Quarterly, Yearly
    "FeaturesJson" TEXT, -- List of features
    "MaxCompanies" INTEGER NOT NULL,
    "MaxProducts" INTEGER NOT NULL,
    "MaxUsers" INTEGER NOT NULL,
    "Status" TEXT NOT NULL DEFAULT 'Active' -- Active, Inactive
);

CREATE TABLE IF NOT EXISTS "Users" (
    "Id" UUID PRIMARY KEY,
    "Name" TEXT NOT NULL,
    "Email" TEXT UNIQUE NOT NULL,
    "PasswordHash" TEXT NOT NULL,
    "Role" INTEGER NOT NULL, -- Enum: 0=Admin, 1=Customer
    "Avatar" TEXT,
    "ContactNo" TEXT,
    "AllowedTabsPattern" TEXT DEFAULT '*',
    "IsActive" BOOLEAN DEFAULT TRUE,
    "SubscriptionId" UUID,
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Subscriptions" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID UNIQUE NOT NULL REFERENCES "Users"("Id"),
    "PlanId" UUID NOT NULL REFERENCES "SubscriptionPlans"("Id"),
    "StartDate" TIMESTAMP WITH TIME ZONE,
    "EndDate" TIMESTAMP WITH TIME ZONE,
    "Status" TEXT NOT NULL DEFAULT 'Pending', -- Active, Expired, Pending, Rejected
    "ApprovedBy" UUID REFERENCES "Users"("Id"),
    "CreatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "UpdatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Companies" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL REFERENCES "Users"("Id"),
    "Name" TEXT NOT NULL,
    "Address" TEXT,
    "Country" TEXT,
    "Currency" TEXT,
    "CurrencySymbol" TEXT,
    "Contact" TEXT,
    "Type" INTEGER NOT NULL,
    "TaxId" TEXT,
    "GstNumber" TEXT,
    "LicenseNumber" TEXT,
    "BankAccount" TEXT,
    "IfscCode" TEXT,
    "Industry" TEXT,
    "Employees" INTEGER DEFAULT 0,
    "Revenue" DECIMAL DEFAULT 0,
    "Expenses" DECIMAL DEFAULT 0,
    "IncorporationDate" TIMESTAMP WITH TIME ZONE,
    "Website" TEXT
);

CREATE TABLE IF NOT EXISTS "Products" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL REFERENCES "Users"("Id"),
    "CompanyId" UUID NOT NULL REFERENCES "Companies"("Id"),
    "Name" TEXT NOT NULL,
    "Description" TEXT,
    "Category" TEXT,
    "Price" DECIMAL NOT NULL,
    "PurchasePrice" DECIMAL,
    "Stock" INTEGER DEFAULT 0,
    "Supplier" TEXT,
    "Sku" TEXT,
    "Image" TEXT,
    "CustomAttributesJson" TEXT
);

CREATE TABLE IF NOT EXISTS "Customers" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL REFERENCES "Users"("Id"),
    "CompanyId" UUID NOT NULL REFERENCES "Companies"("Id"),
    "Name" TEXT NOT NULL,
    "Email" TEXT,
    "Phone" TEXT,
    "Address" TEXT,
    "Group" INTEGER NOT NULL DEFAULT 0,
    "TotalSpent" DECIMAL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "Transactions" (
    "Id" UUID PRIMARY KEY,
    "UserId" UUID NOT NULL REFERENCES "Users"("Id"),
    "CompanyId" UUID NOT NULL REFERENCES "Companies"("Id"),
    "Type" TEXT NOT NULL, -- PURCHASE or SALE
    "TotalAmount" DECIMAL NOT NULL,
    "TotalTax" DECIMAL NOT NULL,
    "Date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "EntityName" TEXT,
    "InvoiceNumber" TEXT
);

CREATE TABLE IF NOT EXISTS "TransactionItems" (
    "Id" UUID PRIMARY KEY,
    "TransactionId" UUID NOT NULL REFERENCES "Transactions"("Id") ON DELETE CASCADE,
    "ProductId" UUID NOT NULL REFERENCES "Products"("Id"),
    "ProductName" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "UnitPrice" DECIMAL NOT NULL,
    "TaxRate" DECIMAL NOT NULL,
    "TaxAmount" DECIMAL NOT NULL,
    "TotalAmount" DECIMAL NOT NULL
);

-- Seed Initial Plans
INSERT INTO "SubscriptionPlans" ("Id", "Name", "Description", "Price", "Validity", "FeaturesJson", "MaxCompanies", "MaxProducts", "MaxUsers", "Status") VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Basic', 'Standard ERP features for small businesses', 29.99, 'Monthly', '["Invoicing", "Inventory Management", "Client Database"]', 1, 100, 2, 'Active'),
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Standard', 'Advanced features for growing businesses', 79.99, 'Monthly', '["Everything in Basic", "Advanced Analytics", "Multi-company Support"]', 5, 1000, 10, 'Active'),
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Premium', 'Unlimited access for large corporations', 199.99, 'Yearly', '["Everything in Standard", "Priority Support", "Custom Integrations"]', 99, 99999, 100, 'Active')
ON CONFLICT ("Id") DO NOTHING;

