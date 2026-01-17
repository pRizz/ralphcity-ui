---
status: issues_found
phase: 02-core-clone
source: [02-01-SUMMARY.md, 02-02-SUMMARY.md]
started: 2026-01-17T20:40:00Z
updated: 2026-01-17T20:45:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Clone from URL Option in Dropdown
expected: Click the repo selector dropdown. You should see a "Clone from URL..." option at the bottom of the dropdown menu.
result: pass

### 2. Clone Dialog Opens
expected: Click "Clone from URL..." in the dropdown. A dialog should open with a URL input field, placeholder text showing example URL format, and Clone/Cancel buttons.
result: pass

### 3. Clone Public Repository
expected: Paste a public git URL (e.g., https://github.com/octocat/Hello-World.git) and click Clone. The repository should be cloned to ~/ralphtown/ and a success message should appear.
result: issue
reported: "I got an error when trying to clone https://github.com/octocat/Hello-World.git: Failed to clone repository. Connection to the server was lost."
severity: major

### 4. Cloned Repo Auto-Selected
expected: After successful clone, the dialog closes, the new repository appears in the repo selector, and it is automatically selected as the current repo.
result: skipped
reason: Depends on Test 3 which failed

## Summary

total: 4
passed: 2
issues: 1
pending: 0
skipped: 1

## Gaps

- truth: "Clone public repository succeeds and shows success message"
  status: failed
  reason: "User reported: I got an error when trying to clone https://github.com/octocat/Hello-World.git: Failed to clone repository. Connection to the server was lost."
  severity: major
  test: 3
  root_cause: ""
  artifacts: []
  missing: []
  debug_session: ""
