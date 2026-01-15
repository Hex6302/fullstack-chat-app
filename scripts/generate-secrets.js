#!/usr/bin/env node

/**
 * Utility script to generate secure JWT secrets
 * Usage: node scripts/generate-secrets.js
 * Or from backend directory: node ../scripts/generate-secrets.js
 */

const crypto = require('crypto');

const generateSecret = (length = 64) => {
  return crypto.randomBytes(length).toString('hex');
};

console.log('🔐 Generating secure JWT secrets...\n');
console.log('Copy these to your environment variables:\n');
console.log('JWT_SECRET=' + generateSecret());
console.log('JWT_REFRESH_SECRET=' + generateSecret());
console.log('\n✅ Secrets generated successfully!');
console.log('⚠️  Keep these secrets secure and never commit them to Git!');

