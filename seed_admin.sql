-- Seed Super Admin User for Setu Business Suite
-- Password: Admin@123  (BCrypt hash below)
-- IMPORTANT: Run this only once to create the initial Super Admin

INSERT INTO "Users" (
    "Id",
    "Name",
    "Email",
    "PasswordHash",
    "Role",
    "ContactNo",
    "AllowedTabsPattern",
    "IsActive",
    "CreatedAt",
    "UpdatedAt"
)
VALUES (
    gen_random_uuid(),
    'Super Admin',
    'admin@setu.in',
    '$2a$11$KVdLIQYHRjS5xTW.2gTUWuYDvd5ZT5C63JGTyJHn1K2g.qrFBxq1y',  -- Admin@123
    0,        -- Role: 0 = Admin
    '9999999999',
    '*',
    true,
    NOW(),
    NOW()
)
ON CONFLICT ("Email") DO NOTHING;

-- Verify the user was created
SELECT "Id", "Name", "Email", "Role", "IsActive", "CreatedAt"
FROM "Users"
WHERE "Email" = 'admin@setu.in';
