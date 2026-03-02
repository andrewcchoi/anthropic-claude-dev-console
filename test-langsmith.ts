import {
  startWorkflowTrace,
  traceSubagent,
  endWorkflowTrace,
  isTracingEnabled,
  getTracingConfig,
} from './src/lib/tracing';

async function testLangSmith() {
  console.log('\n=== LangSmith Tracing Test ===\n');
  
  const config = getTracingConfig();
  console.log('Configuration:');
  console.log('  Project:', config.project);
  console.log('  Enabled:', config.enabled);
  console.log('  Debug:', config.debug);
  console.log('  Has API Key:', !!config.apiKey);
  
  if (!isTracingEnabled()) {
    console.error('\n❌ Tracing not enabled!');
    console.log('Check your .env file has:');
    console.log('  LANGSMITH_API_KEY=your-key');
    console.log('  LANGSMITH_TRACING=true');
    return;
  }

  console.log('\n✅ Tracing enabled!\n');

  const workflowId = `test-workflow-${Date.now()}`;
  console.log(`Starting workflow: ${workflowId}`);

  try {
    // Start workflow
    await startWorkflowTrace({
      workflowId,
      taskDescription: 'LangSmith Integration Test',
      startedAt: new Date(),
    });
    console.log('  ✓ Workflow trace started');

    // Trace a simple subagent
    console.log('\nExecuting subagent...');
    const result = await traceSubagent(
      {
        workflowId,
        phase: 'test',
        subagentId: 'test-sub-1',
        subagentType: 'general-purpose',
        focusArea: 'Testing',
        prompt: 'Verify LangSmith integration',
      },
      async () => {
        // Simulate some work
        await new Promise(resolve => setTimeout(resolve, 500));
        return {
          success: true,
          output: 'LangSmith tracing verified!',
          tokensUsed: 150,
        };
      }
    );

    console.log('  ✓ Subagent completed:', result);

    // End workflow
    await endWorkflowTrace(workflowId, true);
    console.log('  ✓ Workflow trace ended\n');

    console.log('✅ Test complete! Check your LangSmith dashboard:');
    console.log(`   https://smith.langchain.com (Project: ${config.project})\n`);
  } catch (error) {
    console.error('\n❌ Test failed:', error);
    throw error;
  }
}

testLangSmith().catch(console.error);
