import 'dotenv/config';

function required(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing environment variable: ${name} (see .env.example)`);
    process.exit(1);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  // The account registered with this e-mail becomes the admin.
  adminEmail: (process.env.ADMIN_EMAIL || '').toLowerCase().trim(),
  // Comma-separated list of allowed frontend origins.
  clientUrls: (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((s) => s.trim()),
};
