# Security Review Recommendations

Improvements identified during project security and best practices review.

## High Priority

### Add Resource Cleanup

- [ ] Create cleanup functions for media streams
- [ ] Stop all tracks when switching stations or on error
- [ ] Properly close peer connections on disconnect
- [ ] Release wake lock when no longer needed
- [ ] Return cleanup function from `initBabyStation` and `initParentStation`

**Files**: `src/baby-station.ts`, `src/parent-station.ts`, `src/utils.ts`

## Medium Priority

### Fix Wake Lock Memory Leak

- [ ] Prevent accumulation of `visibilitychange` event listeners
- [ ] Track listener reference for proper removal
- [ ] Add cleanup function to release wake lock and remove listener

**Files**: `src/utils.ts`

## Low Priority

### Add Input Validation

- [ ] Validate peer ID format and length
- [ ] Sanitize URL parameters before use
- [ ] Add maximum length constraints
- [ ] Reject invalid characters

**Files**: `src/main.ts`

### Add Content Security Policy

- [ ] Add CSP meta tag to `index.html`
- [ ] Restrict script sources
- [ ] Restrict connection sources to PeerJS server

**Files**: `index.html`

## Optional Enhancements

### Self-hosted PeerJS Server

- [ ] Document how to deploy private PeerJS server
- [ ] Add configuration option for custom signaling server
- [ ] Update README with self-hosting instructions

**Files**: `README.md`, `src/baby-station.ts`, `src/parent-station.ts`

### Improve Type Safety

- [ ] Add proper type declarations for Wake Lock API
- [ ] Reduce non-null assertions where possible
- [ ] Add runtime checks before using optional APIs

**Files**: `src/utils.ts`, `src/main.ts`
