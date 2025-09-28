#!/usr/bin/env tsx
/**
 * Generate 50 promotional codes for early access and marketing
 */

import { db } from '../server/db';
import { promoCodes } from '../shared/schema';
import crypto from 'crypto';

interface PromoCodeTemplate {
  prefix: string;
  creditAmount: number;
  subscriptionType: 'none' | 'starter' | 'pro';
  subscriptionDays: number;
  count: number;
  notes: string;
}

function generateCode(prefix: string): string {
  // Generate a random 8-character alphanumeric code
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${result}`;
}

async function generatePromoCodes() {
  console.log('🎯 Generating promotional codes...');
  
  const templates: PromoCodeTemplate[] = [
    {
      prefix: 'EARLY',
      creditAmount: 50,
      subscriptionType: 'none',
      subscriptionDays: 0,
      count: 20,
      notes: 'Early access - 50 free credits'
    },
    {
      prefix: 'PRO30',
      creditAmount: 100,
      subscriptionType: 'pro',
      subscriptionDays: 30,
      count: 10,
      notes: 'Pro trial - 100 credits + 30 days pro'
    },
    {
      prefix: 'VIP90',
      creditAmount: 200,
      subscriptionType: 'pro',
      subscriptionDays: 90,
      count: 5,
      notes: 'VIP access - 200 credits + 90 days pro'
    },
    {
      prefix: 'BETA',
      creditAmount: 25,
      subscriptionType: 'none',
      subscriptionDays: 0,
      count: 15,
      notes: 'Beta tester - 25 free credits'
    }
  ];
  
  const generatedCodes = [];
  
  try {
    for (const template of templates) {
      console.log(`\n📝 Generating ${template.count} codes with prefix "${template.prefix}"...`);
      
      for (let i = 0; i < template.count; i++) {
        let code = generateCode(template.prefix);
        let attempts = 0;
        
        // Ensure code is unique
        while (attempts < 10) {
          try {
            const newCode = {
              code,
              creditAmount: template.creditAmount,
              subscriptionType: template.subscriptionType,
              subscriptionDays: template.subscriptionDays,
              maxUses: 1, // Single use codes
              isActive: true,
              notes: template.notes
            };
            
            await db.insert(promoCodes).values(newCode);
            generatedCodes.push({ ...newCode, type: template.prefix });
            console.log(`  ✅ ${code} - ${template.creditAmount} credits${template.subscriptionType !== 'none' ? ` + ${template.subscriptionDays} days ${template.subscriptionType}` : ''}`);
            break;
          } catch (error) {
            if (error && typeof error === 'object' && 'code' in error && error.code === '23505') {
              // Unique constraint violation - generate new code
              code = generateCode(template.prefix);
              attempts++;
              continue;
            }
            throw error;
          }
        }
        
        if (attempts >= 10) {
          console.error(`❌ Failed to generate unique code after 10 attempts`);
        }
      }
    }
    
    console.log(`\n🎉 Successfully generated ${generatedCodes.length} promotional codes!`);
    
    // Summary
    console.log('\n📊 SUMMARY:');
    const summary = generatedCodes.reduce((acc, code) => {
      acc[code.type] = (acc[code.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(summary).forEach(([type, count]) => {
      const template = templates.find(t => t.prefix === type);
      console.log(`  ${type}: ${count} codes (${template?.creditAmount} credits${template?.subscriptionType !== 'none' ? ` + ${template?.subscriptionDays} days ${template?.subscriptionType}` : ''})`);
    });
    
    console.log('\n🎁 Special codes for you:');
    const vipCodes = generatedCodes.filter(c => c.type === 'VIP90').slice(0, 2);
    vipCodes.forEach(code => {
      console.log(`  🏆 ${code.code} - Use this for your account (200 credits + 90 days pro)`);
    });
    
  } catch (error) {
    console.error('❌ Error generating promo codes:', error);
    process.exit(1);
  }
}

// Only run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePromoCodes()
    .then(() => {
      console.log('✅ Promo code generation completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    });
}