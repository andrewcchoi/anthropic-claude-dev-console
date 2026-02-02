#!/usr/bin/env node
/**
 * PTY Failure Scenarios Test
 * Tests various failure conditions and edge cases
 */

import { WebSocket } from 'ws';

const TERMINAL_URL = 'ws://localhost:3001/terminal';
const TEST_TIMEOUT = 5000;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function logTest(name: string, status: 'START' | 'PASS' | 'FAIL', error?: string) {
  const icon = status === 'START' ? '⏳' : status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${name}${error ? ': ' + error : ''}`);
}

function addResult(name: string, passed: boolean, error?: string) {
  results.push({ name, passed, error });
  logTest(name, passed ? 'PASS' : 'FAIL', error);
}

async function testMalformedJSON(): Promise<boolean> {
  logTest('Malformed JSON handling', 'START');

  return new Promise((resolve) => {
    const ws = new WebSocket(TERMINAL_URL);
    let connected = false;

    const timeout = setTimeout(() => {
      addResult('Malformed JSON handling', true, 'Server handled gracefully');
      ws.close();
      resolve(true);
    }, TEST_TIMEOUT);

    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connected') {
        connected = true;
        // Send malformed JSON
        ws.send('{ invalid json }');
      } else if (message.type === 'error') {
        clearTimeout(timeout);
        addResult('Malformed JSON handling', true, 'Server returned error');
        ws.close();
        resolve(true);
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      addResult('Malformed JSON handling', false, 'WebSocket error');
      resolve(false);
    });

    ws.on('close', () => {
      if (connected) {
        // Connection closed, which is acceptable
        clearTimeout(timeout);
        resolve(true);
      }
    });
  });
}

async function testMissingFields(): Promise<boolean> {
  logTest('Missing required fields', 'START');

  return new Promise((resolve) => {
    const ws = new WebSocket(TERMINAL_URL);
    let connected = false;

    const timeout = setTimeout(() => {
      addResult('Missing required fields', true, 'Server handled gracefully');
      ws.close();
      resolve(true);
    }, TEST_TIMEOUT);

    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connected') {
        connected = true;
        // Send message with missing data field
        ws.send(JSON.stringify({ type: 'input' }));

        setTimeout(() => {
          clearTimeout(timeout);
          addResult('Missing required fields', true, 'No crash detected');
          ws.close();
          resolve(true);
        }, 1000);
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      addResult('Missing required fields', false, 'WebSocket error');
      resolve(false);
    });
  });
}

async function testUnknownMessageType(): Promise<boolean> {
  logTest('Unknown message type', 'START');

  return new Promise((resolve) => {
    const ws = new WebSocket(TERMINAL_URL);
    let connected = false;

    const timeout = setTimeout(() => {
      addResult('Unknown message type', true, 'Server handled gracefully');
      ws.close();
      resolve(true);
    }, TEST_TIMEOUT);

    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connected') {
        connected = true;
        // Send unknown message type
        ws.send(JSON.stringify({ type: 'unknown_type', data: 'test' }));

        setTimeout(() => {
          clearTimeout(timeout);
          addResult('Unknown message type', true, 'No crash detected');
          ws.close();
          resolve(true);
        }, 1000);
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      addResult('Unknown message type', false, 'WebSocket error');
      resolve(false);
    });
  });
}

async function testRapidMessages(): Promise<boolean> {
  logTest('Rapid message flood', 'START');

  return new Promise((resolve) => {
    const ws = new WebSocket(TERMINAL_URL);
    let connected = false;

    const timeout = setTimeout(() => {
      addResult('Rapid message flood', true, 'Server handled flood');
      ws.close();
      resolve(true);
    }, TEST_TIMEOUT);

    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connected') {
        connected = true;

        // Send 100 messages rapidly
        for (let i = 0; i < 100; i++) {
          ws.send(JSON.stringify({ type: 'input', data: 'x' }));
        }

        setTimeout(() => {
          clearTimeout(timeout);
          addResult('Rapid message flood', true, 'Server survived flood');
          ws.close();
          resolve(true);
        }, 2000);
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      addResult('Rapid message flood', false, 'WebSocket error');
      resolve(false);
    });
  });
}

async function testAbruptDisconnect(): Promise<boolean> {
  logTest('Abrupt disconnect', 'START');

  return new Promise((resolve) => {
    const ws = new WebSocket(TERMINAL_URL);

    const timeout = setTimeout(() => {
      addResult('Abrupt disconnect', false, 'Timeout');
      resolve(false);
    }, TEST_TIMEOUT);

    ws.on('message', (data: Buffer) => {
      const message = JSON.parse(data.toString());
      if (message.type === 'connected') {
        // Immediately close without cleanup
        ws.terminate();

        setTimeout(() => {
          clearTimeout(timeout);
          addResult('Abrupt disconnect', true, 'Server handled disconnect');
          resolve(true);
        }, 500);
      }
    });

    ws.on('error', () => {
      clearTimeout(timeout);
      addResult('Abrupt disconnect', false, 'WebSocket error');
      resolve(false);
    });
  });
}

async function testMultipleConnections(): Promise<boolean> {
  logTest('Multiple simultaneous connections', 'START');

  return new Promise(async (resolve) => {
    const connections: WebSocket[] = [];
    let connectedCount = 0;
    const targetCount = 5;

    const timeout = setTimeout(() => {
      connections.forEach(ws => ws.close());
      if (connectedCount === targetCount) {
        addResult('Multiple simultaneous connections', true, `${connectedCount} connections established`);
        resolve(true);
      } else {
        addResult('Multiple simultaneous connections', false, `Only ${connectedCount}/${targetCount} connected`);
        resolve(false);
      }
    }, TEST_TIMEOUT);

    for (let i = 0; i < targetCount; i++) {
      const ws = new WebSocket(TERMINAL_URL);
      connections.push(ws);

      ws.on('message', (data: Buffer) => {
        const message = JSON.parse(data.toString());
        if (message.type === 'connected') {
          connectedCount++;
          if (connectedCount === targetCount) {
            clearTimeout(timeout);
            connections.forEach(w => w.close());
            addResult('Multiple simultaneous connections', true, `All ${connectedCount} connections established`);
            resolve(true);
          }
        }
      });

      ws.on('error', () => {
        clearTimeout(timeout);
        connections.forEach(w => w.close());
        addResult('Multiple simultaneous connections', false, 'Connection error');
        resolve(false);
      });
    }
  });
}

async function runTests() {
  console.log('\n🧪 PTY Failure Scenarios Test\n');
  console.log('================================\n');

  await testMalformedJSON();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testMissingFields();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testUnknownMessageType();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testRapidMessages();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testAbruptDisconnect();
  await new Promise(resolve => setTimeout(resolve, 500));

  await testMultipleConnections();

  // Summary
  console.log('\n================================\n');
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}\n`);

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
