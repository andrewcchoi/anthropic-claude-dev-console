#!/bin/bash
# Generate test data for troubleshoot-recorder plugin

STORAGE_DIR="/workspace/.claude/troubleshoot"

# Test Event 1: File not found error
cat >> "$STORAGE_DIR/events.jsonl" <<'EOF'
{"id":"evt_001","timestamp":"2026-01-27T10:00:00Z","sessionId":"sess_test_001","type":"error","error":{"message":"ENOENT: no such file or directory, open '/workspace/logs/telemetry.jsonl'","source":"tool","toolName":"Write","toolInput":{"file_path":"/workspace/logs/telemetry.jsonl"}}}
EOF

# Test Event 2: Another file error (same problem)
cat >> "$STORAGE_DIR/events.jsonl" <<'EOF'
{"id":"evt_002","timestamp":"2026-01-27T10:05:00Z","sessionId":"sess_test_001","type":"error","error":{"message":"ENOENT: no such file or directory, open '/workspace/logs/telemetry.jsonl'","source":"tool","toolName":"Write","toolInput":{"file_path":"/workspace/logs/telemetry.jsonl"}}}
EOF

# Test Event 3: TypeScript error (different problem)
cat >> "$STORAGE_DIR/events.jsonl" <<'EOF'
{"id":"evt_003","timestamp":"2026-01-27T10:10:00Z","sessionId":"sess_test_001","type":"error","error":{"message":"TypeError: Cannot read property 'telemetry' of undefined","source":"tool","toolName":"Bash","toolInput":"npm run build"}}
EOF

# Test Problem 1: Solved file system problem
cat >> "$STORAGE_DIR/problems.jsonl" <<'EOF'
{"id":"prob_001","title":"ENOENT error in telemetry logging","category":"file-system","status":"solved","errorSignature":{"message":"enoent: no such file or directory, open '<PATH>'","patterns":["ENOENT","no such file"]},"attempts":[{"id":"att_001","timestamp":"2026-01-27T10:02:00Z","description":"Created logs directory","outcome":"success","afterCode":{"filePath":"/workspace/src/app/api/claude/route.ts","content":"await fs.mkdir('/workspace/logs', {recursive: true})","status":"after"}}],"rootCause":"Log directory was not created before attempting to write telemetry file","solution":{"description":"Add directory creation before file write operations","codeChanges":[{"filePath":"/workspace/src/app/api/claude/route.ts","before":"// Write telemetry directly","after":"await fs.mkdir('/workspace/logs', {recursive: true})\n// Write telemetry","lineNumbers":[45,46],"description":"Added mkdir with recursive option"}],"verificationSteps":["Run the server and trigger telemetry logging","Check that /workspace/logs directory exists","Verify telemetry.jsonl is created successfully"]},"lessonLearned":{"keyInsight":"Always ensure parent directories exist before file I/O operations","explanation":"File system write operations will fail if the parent directory doesn't exist. Using mkdir with recursive option ensures all parent directories are created.","preventionTips":["Add directory creation to initialization scripts","Use fs.mkdir with recursive: true option","Document directory structure requirements"]},"sessionIds":["sess_test_001"],"eventIds":["evt_001","evt_002"],"createdAt":"2026-01-27T10:00:00Z","updatedAt":"2026-01-27T10:03:00Z","resolvedAt":"2026-01-27T10:03:00Z"}
EOF

# Test Problem 2: Under investigation
cat >> "$STORAGE_DIR/problems.jsonl" <<'EOF'
{"id":"prob_002","title":"TypeScript build failure with undefined telemetry","category":"logic","status":"investigating","errorSignature":{"message":"typeerror: cannot read property 'telemetry' of undefined","patterns":["TypeError","undefined"]},"attempts":[{"id":"att_002","timestamp":"2026-01-27T10:12:00Z","description":"Added null check for telemetry object","outcome":"partial"}],"sessionIds":["sess_test_001"],"eventIds":["evt_003"],"createdAt":"2026-01-27T10:10:00Z","updatedAt":"2026-01-27T10:12:00Z"}
EOF

# Test Session
cat >> "$STORAGE_DIR/sessions.jsonl" <<'EOF'
{"id":"sess_test_001","startTime":"2026-01-27T10:00:00Z","endTime":"2026-01-27T10:15:00Z","problemIds":["prob_001","prob_002"],"eventCount":3,"status":"completed"}
EOF

echo "Test data created successfully"
echo "- 3 events"
echo "- 2 problems (1 solved, 1 investigating)"
echo "- 1 session"
