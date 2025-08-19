#!/usr/bin/env node

/**
 * Comprehensive production build test
 */

const http = require('http');
const { FFmpegUtils } = require('./server/services/ffmpeg/FFmpegUtils.js');

const PORT = process.env.PORT || 3123;
const BASE_URL = `http://localhost:${PORT}`;

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m'
};

async function testEndpoint(path, method = 'GET', data = null) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          body: body,
          success: res.statusCode >= 200 && res.statusCode < 300
        });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, error: err.message, success: false });
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log(`${colors.yellow}═══ Production Build Tests ═══${colors.reset}\n`);
  
  let allPassed = true;
  const results = [];

  // Test 1: Health endpoint
  console.log('Testing /health endpoint...');
  const health = await testEndpoint('/health');
  results.push({
    test: 'Health endpoint',
    passed: health.success
  });

  // Test 2: Models API
  console.log('Testing /api/models endpoint...');
  const models = await testEndpoint('/api/models');
  results.push({
    test: 'Models API',
    passed: models.success
  });

  // Test 3: Client serving
  console.log('Testing client serving...');
  const client = await testEndpoint('/index.html');
  results.push({
    test: 'Client serving',
    passed: client.success && client.body.includes('<!doctype html>')
  });

  // Test 4: FFmpegUtils
  console.log('Testing FFmpegUtils...');
  try {
    const availability = await FFmpegUtils.checkAvailability();
    results.push({
      test: 'FFmpegUtils',
      passed: availability.ffmpeg && availability.ffprobe
    });
  } catch (err) {
    results.push({
      test: 'FFmpegUtils',
      passed: false,
      error: err.message
    });
  }

  // Test 5: 404 handling
  console.log('Testing 404 handling...');
  const notFound = await testEndpoint('/nonexistent');
  results.push({
    test: '404 handling',
    passed: notFound.status === 404
  });

  // Print results
  console.log(`\n${colors.yellow}═══ Results ═══${colors.reset}\n`);
  
  for (const result of results) {
    const icon = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const error = result.error ? ` (${result.error})` : '';
    console.log(`${icon} ${result.test}${error}`);
    if (!result.passed) allPassed = false;
  }

  // Summary
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  console.log(`\n${colors.yellow}═══ Summary ═══${colors.reset}`);
  console.log(`Passed: ${passed}/${total}`);
  
  if (allPassed) {
    console.log(`${colors.green}✓ All tests passed!${colors.reset}`);
    console.log(`${colors.green}Production build is working correctly!${colors.reset}`);
  } else {
    console.log(`${colors.red}✗ Some tests failed${colors.reset}`);
  }
  
  return allPassed;
}

// Wait a bit for server to be ready
setTimeout(() => {
  runTests().then(success => {
    process.exit(success ? 0 : 1);
  });
}, 1000);