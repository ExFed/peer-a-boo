# Security Review Recommendations

Improvements identified during project security and best practices review.

## High Priority

### Add Resource Cleanup

- [x] Create cleanup functions for media streams
- [x] Stop all tracks when switching stations or on error
- [x] Properly close peer connections on disconnect
- [x] Release wake lock when no longer needed
- [x] Return cleanup function from `initBabyStation` and `initParentStation`

**Files**: `src/baby-station.ts`, `src/parent-station.ts`, `src/utils.ts`

## Medium Priority

### Fix Wake Lock Memory Leak

- [x] Prevent accumulation of `visibilitychange` event listeners
- [x] Track listener reference for proper removal
- [x] Add cleanup function to release wake lock and remove listener

**Files**: `src/utils.ts`

## Low Priority

### Add Content Security Policy

- [x] Add CSP meta tag to `index.html`
- [x] Restrict script sources
- [x] Restrict connection sources to PeerJS server

**Files**: `index.html`

## Optional Enhancements

### Improve Type Safety

- [x] Add proper type declarations for Wake Lock API
- [x] Reduce non-null assertions where possible
- [x] Add runtime checks before using optional APIs

**Files**: `src/utils.ts`, `src/main.ts`
