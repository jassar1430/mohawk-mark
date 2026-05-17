# Security Specification - TripQuest

## Data Invariants
1. A user profile must have a valid UID matching the document ID.
2. XP and Level are stored as numbers and updated periodically.
3. Leaderboard entries are public for reading but only writable by the owner.
4. Saved quests belong strictly to the owner.

## The Dirty Dozen Payloads (Target: DENIED)
1. **Identity Spoofing**: Attempt to create/update a user profile for a different UID.
2. **Shadow Field Injection**: Attempt to add `isAdmin: true` to a user profile update.
3. **Type Poisoning**: Sending `xp: "unlimited"` as a string.
4. **Boundary Violation**: Sending a 2MB string as `bio`.
5. **Leaderboard Takeover**: Attempt to update someone else's leaderboard stats.
6. **Quest Orphanage**: Attempt to save a quest with a different `userId` than the auth UID.
7. **Social Media Impersonation**: Attempt to change another user's `socialX` handle.
8. **Level Skipping**: (Hard to prevent purely with rules without a backend, but we can enforce increment-only if we had the logic, here we just ensure owner-only).
9. **PII Leak**: Authenticated user trying to list the entire `/users` collection (we restrict to `get` only for self).
10. **ID Poisoning**: Using a 500-character string as a `questId`.
11. **Quest Counterfeiting**: Sending `createdAt` as a past timestamp instead of `request.time`.
12. **Leaderboard Extraction**: Unauthenticated user trying to read the leaderboard.

## The Test Runner
A `firestore.rules.test.ts` will be implemented to verify these constraints.
