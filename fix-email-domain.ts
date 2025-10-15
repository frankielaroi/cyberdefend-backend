/**
 * Quick Fix Script for Email Domain Issue
 * 
 * This script helps you fix the "domain not allowed" error by:
 * 1. Checking your current configuration
 * 2. Providing instructions to fix the issue
 * 3. Offering to update your .env file
 * 
 * Usage: npx ts-node fix-email-domain.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

interface EnvConfig {
  MAILTRAP_FROM_EMAIL?: string;
  MAILTRAP_FROM_NAME?: string;
  MAILTRAP_API_TOKEN?: string;
}

function parseEnvFile(filePath: string): EnvConfig {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const config: EnvConfig = {};

  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;

    const [key, ...valueParts] = trimmed.split('=');
    const value = valueParts.join('=').replace(/["']/g, '');

    if (key === 'MAILTRAP_FROM_EMAIL' || 
        key === 'MAILTRAP_FROM_NAME' || 
        key === 'MAILTRAP_API_TOKEN') {
      config[key] = value;
    }
  });

  return config;
}

function updateEnvFile(updates: Record<string, string>) {
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found!');
    return false;
  }

  let content = fs.readFileSync(envPath, 'utf-8');
  
  Object.entries(updates).forEach(([key, value]) => {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (content.match(regex)) {
      content = content.replace(regex, `${key}="${value}"`);
    } else {
      content += `\n${key}="${value}"`;
    }
  });

  fs.writeFileSync(envPath, content);
  return true;
}

async function askQuestion(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('🔧 Email Domain Fix Script\n');
  console.log('=' .repeat(60));

  // Check if .env exists
  if (!fs.existsSync(envPath)) {
    console.log('❌ .env file not found!');
    console.log('📋 Please copy .env.example to .env first:');
    console.log('   cp .env.example .env\n');
    return;
  }

  // Parse current configuration
  const config = parseEnvFile(envPath);

  console.log('\n📊 Current Configuration:');
  console.log(`   MAILTRAP_FROM_EMAIL: ${config.MAILTRAP_FROM_EMAIL || 'NOT SET'}`);
  console.log(`   MAILTRAP_FROM_NAME: ${config.MAILTRAP_FROM_NAME || 'NOT SET'}`);
  console.log(`   MAILTRAP_API_TOKEN: ${config.MAILTRAP_API_TOKEN ? '✅ SET' : '❌ NOT SET'}`);

  // Check for problematic domains
  const problematicDomains = ['cyber360.tech', 'cyberdefend360.com'];
  const currentEmail = config.MAILTRAP_FROM_EMAIL || '';
  const currentDomain = currentEmail.split('@')[1] || '';

  console.log('\n🔍 Analysis:');
  
  if (!config.MAILTRAP_API_TOKEN) {
    console.log('   ❌ Mailtrap API token is not set');
  } else {
    console.log('   ✅ Mailtrap API token is configured');
  }

  if (problematicDomains.includes(currentDomain)) {
    console.log(`   ⚠️  Domain "${currentDomain}" may not be verified in Mailtrap`);
    console.log('   ⚠️  This can cause "domain not allowed" errors');
  } else if (!currentEmail) {
    console.log('   ⚠️  No sender email configured');
  } else {
    console.log(`   ℹ️  Using domain: ${currentDomain}`);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n💡 Solutions:\n');

  console.log('1️⃣  USE VERIFIED DOMAIN (Recommended for Production)');
  console.log('   - Verify cyber360.tech in Mailtrap');
  console.log('   - Add DNS records (SPF, DKIM)');
  console.log('   - See: docs/EMAIL_DOMAIN_SETUP.md\n');

  console.log('2️⃣  USE MAILTRAP INBOX EMAIL (Quick Fix for Development)');
  console.log('   - Get inbox email from Mailtrap dashboard');
  console.log('   - Format: something@inbox.mailtrap.io');
  console.log('   - Works immediately without verification\n');

  console.log('3️⃣  USE GENERIC EMAIL (Temporary Testing)');
  console.log('   - Use: noreply@cyber360.tech');
  console.log('   - May work or may need verification\n');

  console.log('='.repeat(60));

  // Interactive update
  const shouldUpdate = await askQuestion('\n❓ Would you like to update your .env file now? (y/n): ');

  if (shouldUpdate.toLowerCase() !== 'y') {
    console.log('\n📝 No changes made.');
    console.log('💡 Tip: You can manually edit .env file or run this script again.');
    return;
  }

  console.log('\n📝 Which solution do you want to use?');
  console.log('   1 - Keep current domain (verify it in Mailtrap)');
  console.log('   2 - Use Mailtrap inbox email (enter your inbox email)');
  console.log('   3 - Use generic email (noreply@cyber360.tech)');

  const choice = await askQuestion('\nEnter choice (1/2/3): ');

  const updates: Record<string, string> = {};

  switch (choice) {
    case '1':
      console.log(`\n✅ Keeping current email: ${config.MAILTRAP_FROM_EMAIL}`);
      console.log('⚠️  Make sure to verify this domain in Mailtrap!');
      console.log('📖 Instructions: docs/EMAIL_DOMAIN_SETUP.md');
      break;

    case '2':
      const inboxEmail = await askQuestion('\nEnter your Mailtrap inbox email (e.g., abc123@inbox.mailtrap.io): ');
      if (inboxEmail.includes('@inbox.mailtrap.io')) {
        updates.MAILTRAP_FROM_EMAIL = inboxEmail;
        updates.MAILTRAP_FROM_NAME = config.MAILTRAP_FROM_NAME || 'CyberDefend 360 [DEV]';
        console.log(`\n✅ Will update to: ${inboxEmail}`);
      } else {
        console.log('\n❌ Invalid inbox email format. Should be: something@inbox.mailtrap.io');
        return;
      }
      break;

    case '3':
      updates.MAILTRAP_FROM_EMAIL = 'noreply@cyber360.tech';
      updates.MAILTRAP_FROM_NAME = config.MAILTRAP_FROM_NAME || 'CyberDefend 360';
      console.log('\n✅ Will update to: noreply@cyber360.tech');
      break;

    default:
      console.log('\n❌ Invalid choice');
      return;
  }

  if (Object.keys(updates).length > 0) {
    console.log('\n🔄 Updating .env file...');
    
    if (updateEnvFile(updates)) {
      console.log('✅ .env file updated successfully!\n');
      console.log('📋 Updated values:');
      Object.entries(updates).forEach(([key, value]) => {
        console.log(`   ${key}=${value}`);
      });
      
      console.log('\n🔄 Next steps:');
      console.log('   1. Restart your application');
      console.log('   2. Test registration with: npx ts-node test-email-verification.ts');
      console.log('   3. Check logs for "Default sender: ..." message\n');
    } else {
      console.log('❌ Failed to update .env file');
    }
  }
}

main()
  .then(() => {
    console.log('✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
