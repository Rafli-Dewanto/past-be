#!/usr/bin/env node
/**
 * Quick test script to verify logging system components
 * This script tests the logging infrastructure without database dependencies
 */

import { logger } from '../src/utils/logger';
import { createTrackedError } from '../src/utils/error';

console.log('🧪 Testing Logging System Components...\n');

// Test 1: Basic logger functionality
console.log('1. Testing basic logger methods:');
try {
  logger.info('Test info message', { testData: 'sample' });
  logger.warn('Test warning message', { warning: true });
  logger.error('Test error message', null, { errorTest: true });
  logger.debug('Test debug message');
  console.log('✅ Logger methods work correctly\n');
} catch (error) {
  console.log('❌ Logger test failed:', error);
}

// Test 2: TrackedError functionality
console.log('2. Testing TrackedError functionality:');
try {
  const testError = createTrackedError(
    'Test tracked error',
    {
      operation: 'test_script',
      metadata: { test: true }
    }
  );

  console.log('✅ TrackedError created successfully');
  console.log('   Error ID:', testError.errorId);
  console.log('   File trace entries:', testError.fileTrace.length);
  console.log('   Detailed message:', testError.getDetailedMessage());
  console.log();
} catch (error) {
  console.log('❌ TrackedError test failed:', error);
}

// Test 3: Stack trace extraction
console.log('3. Testing stack trace extraction:');
try {
  function testFunction() {
    throw new Error('Test error for stack trace');
  }

  function wrapperFunction() {
    testFunction();
  }

  try {
    wrapperFunction();
  } catch (error) {
    const trackedError = createTrackedError(
      'Stack trace test',
      { operation: 'stack_trace_test' },
      error instanceof Error ? error : new Error(String(error))
    );

    console.log('✅ Stack trace extracted successfully');
    console.log('   File trace:');
    trackedError.fileTrace.forEach((trace, index) => {
      console.log(`   ${index + 1}. ${trace.file}:${trace.line} in ${trace.function}()`);
    });
    console.log();
  }
} catch (error) {
  console.log('❌ Stack trace test failed:', error);
}

console.log('🎉 Logging system component tests completed!');
console.log('📝 Note: Database-dependent features require Prisma client regeneration and migration');