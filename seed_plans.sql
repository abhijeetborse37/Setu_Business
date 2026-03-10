INSERT INTO "SubscriptionPlans" ("Id", "Name", "Description", "Price", "Validity", "FeaturesJson", "MaxCompanies", "MaxProducts", "MaxUsers", "Status") VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Basic', 'Standard ERP features for small businesses', 29.99, 'Monthly', '["Invoicing", "Inventory Management", "Client Database"]', 1, 100, 2, 'Active'), 
('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Standard', 'Advanced features for growing businesses', 79.99, 'Monthly', '["Everything in Basic", "Advanced Analytics", "Multi-company Support"]', 5, 1000, 10, 'Active'), 
('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Premium', 'Unlimited access for large corporations', 199.99, 'Yearly', '["Everything in Standard", "Priority Support", "Custom Integrations"]', 99, 99999, 100, 'Active') 
ON CONFLICT ("Id") DO NOTHING;
