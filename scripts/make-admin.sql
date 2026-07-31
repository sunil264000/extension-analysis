-- Make a user an admin
-- Usage: psql -h host -U user -d database -f make-admin.sql

UPDATE "user" 
SET role = 'admin', "updatedAt" = NOW()
WHERE email = 'ks.sunilkumar.264@gmail.com'
RETURNING id, email, role, "updatedAt";
