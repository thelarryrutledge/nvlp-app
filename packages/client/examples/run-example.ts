#!/usr/bin/env ts-node

import { httpClientExample, customRetryExample } from './http-client-usage';

async function main() {
  console.log('🚀 Running HTTP Client Examples...\n');
  
  try {
    console.log('📡 Basic HTTP Client Example:');
    await httpClientExample();
    
    console.log('\n🔄 Custom Retry Example:');
    await customRetryExample();
    
  } catch (error) {
    console.error('❌ Example failed:', error);
    process.exit(1);
  }
  
  console.log('\n✅ Examples completed successfully!');
}

main();