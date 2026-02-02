#!/usr/bin/env node
/**
 * Terminal Connectivity Test
 * Tests WebSocket server, PTY spawn, and message protocol
 */

import { WebSocket } from 'ws';

const TERMINAL_URL = 'ws://localhost:3001/terminal';
const HEALTH_URL = 'http://localhost:3001/health';
const TEST_TIMEOUT = 10000;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration?: number;
}

const results: TestResult[] = [];

function logTest(name: string, status: 'START' | 'PASS' | 'FAIL', error?: string) {
  const icon = status === 'START' ? '⏳' : status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${name}${error ? ': ' + error : ''}`);
}

function addResult(name: string, passed: boolean, error?: string, duration?: number) {
  results.push({ name, passed, error, duration });
  logTest(name, passed ? 'PASS' : 'FAIL', error);
}

async function testHealthEndpoint(): Promise<boolean> {
  logTest('Health endpoint check', 'START');
  const start = Date.now();

  try {
    const response = await fetch(HEALTH_URL);
    if (!response.ok) {
      addResult('Health endpoint check', false, `HTTP ${response.status}`, Date.now() - start);
      return false;
    }

    const data = await response.json();
    if (data.status !== 'ok') {
      addResult('Health endpoint check', false, 'Status not OK', Date.now() - start);
      return false;
    }

    addResult('Health endpoint check', true, undefined, Date.now() - start);
    return true;
  } catch (error) {
    addResult('Health endpoint check', false, (error as Error).message, Date.now() - start);
    return false;
  }
}

async function testWebSocketConnection(): Promise<boolean> {
  logTest('WebSocket connection', 'START');
  const start = Date.now();

  return new Promise((resolve) => {
    let sessionId: string | null = null;
    const ws = new WebSocket(TERMINAL_URL);

    const timeout = setTimeout(() => {
      addResult('WebSocket connection', false, 'Connection timeout', Date.now() - start);
      ws.close();
      resolve(false);
    }, TEST_TIMEOUT);

    ws.on('open', () => {
      // Connection opened, waiting for connected message
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected' && message.id) {
          sessionId = message.id;
          clearTimeout(timeout);
          addResult('WebSocket connection', true, undefined, Date.now() - start);
          ws.close();
          resolve(true);
        }
      } catch (error) {
        clearTimeout(timeout);
        addResult('WebSocket connection', false, 'Invalid message format', Date.now() - start);
        ws.close();
        resolve(false);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      addResult('WebSocket connection', false, error.message, Date.now() - start);
      resolve(false);
    });

    ws.on('close', () => {
      if (sessionId) {
        // Already passed
      } else {
        clearTimeout(timeout);
        addResult('WebSocket connection', false, 'Connection closed before session established', Date.now() - start);
        resolve(false);
      }
    });
  });
}

async function testPTYEcho(): Promise<boolean> {
  logTest('PTY echo command', 'START');
  const start = Date.now();

  return new Promise((resolve) => {
    const ws = new WebSocket(TERMINAL_URL);
    let connected = false;
    let receivedOutput = false;
    const testString = 'E2E_TEST_STRING_' + Date.now();

    const timeout = setTimeout(() => {
      addResult('PTY echo command', false, 'Test timeout', Date.now() - start);
      ws.close();
      resolve(false);
    }, TEST_TIMEOUT);

    ws.on('open', () => {
      // Wait for connected message
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          connected = true;
          // Send echo command
          ws.send(JSON.stringify({
            type: 'input',
            data: `echo "${testString}"\n`
          }));
        } else if (message.type === 'output' && connected) {
          if (message.data.includes(testString)) {
            receivedOutput = true;
            clearTimeout(timeout);
            addResult('PTY echo command', true, undefined, Date.now() - start);
            ws.close();
            resolve(true);
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        addResult('PTY echo command', false, 'Parse error', Date.now() - start);
        ws.close();
        resolve(false);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      addResult('PTY echo command', false, error.message, Date.now() - start);
      resolve(false);
    });
  });
}

async function testPTYResize(): Promise<boolean> {
  logTest('PTY resize', 'START');
  const start = Date.now();

  return new Promise((resolve) => {
    const ws = new WebSocket(TERMINAL_URL);
    let connected = false;
    let resizeSent = false;

    const timeout = setTimeout(() => {
      addResult('PTY resize', false, 'Test timeout', Date.now() - start);
      ws.close();
      resolve(false);
    }, TEST_TIMEOUT);

    ws.on('open', () => {
      // Wait for connected message
    });

    ws.on('message', (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'connected') {
          connected = true;
          // Send resize command
          ws.send(JSON.stringify({
            type: 'resize',
            cols: 120,
            rows: 40
          }));
          resizeSent = true;

          // Send command to check terminal size
          setTimeout(() => {
            ws.send(JSON.stringify({
              type: 'input',
              data: 'tput cols\n'
            }));
          }, 100);
        } else if (message.type === 'output' && connected && resizeSent) {
          if (message.data.includes('120')) {
            clearTimeout(timeout);
            addResult('PTY resize', true, undefined, Date.now() - start);
            ws.close();
            resolve(true);
          }
        }
      } catch (error) {
        clearTimeout(timeout);
        addResult('PTY resize', false, 'Parse error', Date.now() - start);
        ws.close();
        resolve(false);
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      addResult('PTY resize', false, error.message, Date.now() - start);
      resolve(false);
    });
  });
}

async function runTests() {
  console.log('\n🧪 Terminal Connectivity Tests\n');
  console.log('================================\n');

  // Test 1: Health endpoint
  const healthPassed = await testHealthEndpoint();
  if (!healthPassed) {
    console.log('\n⛔ Server not responding. Skipping remaining tests.\n');
    process.exit(1);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 2: WebSocket connection
  const wsPassed = await testWebSocketConnection();
  if (!wsPassed) {
    console.log('\n⛔ WebSocket connection failed. Skipping PTY tests.\n');
    process.exit(1);
  }

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 3: PTY echo
  await testPTYEcho();

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 4: PTY resize
  await testPTYResize();

  // Summary
  console.log('\n================================\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏱️  Total: ${results.reduce((sum, r) => sum + (r.duration || 0), 0)}ms\n`);

  if (failed > 0) {
    console.log('❌ Some tests failed\n');
    process.exit(1);
  } else {
    console.log('✅ All tests passed!\n');
    process.exit(0);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('\n❌ Test runner error:', error);
  process.exit(1);
});
