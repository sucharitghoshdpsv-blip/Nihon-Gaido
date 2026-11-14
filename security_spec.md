# TabiGuide Security Specification

## 1. Data Invariants
- Every private subcollection document under `/users/{userId}/...` can only be read, created, updated, or deleted by the authenticated, email-verified user whose `request.auth.uid == userId` AND whose payload `ownerUid == request.auth.uid`.
- Every `communityPosts/{postId}` document must contain zero PII (no email, phone, or address), must have `authorUid == request.auth.uid`, and can only be modified or deleted by its original author.
- All timestamps (`createdAt`, `updatedAt`) are enforced server-side via `request.time`.
- All strings and arrays have strict `.size()` limits to prevent payload exhaustion.

## 2. Adversarial Payloads Blocked
1. **Unauthenticated Vault Read**: Anonymous request reading `/users/{uid}/vaultItems/{id}` -> DENIED.
2. **Cross-User Vault Read**: Signed-in User B reading User A's `/users/{uidA}/vaultItems/{id}` -> DENIED.
3. **Shadow Field Injection**: Creating an ExpenseRecord with extra `isAdmin: true` -> DENIED by `keys().hasOnly(...)`.
4. **Identity Spoofing on Community Post**: User B creating a post with `authorUid: uidA` -> DENIED by `data.authorUid == request.auth.uid`.
5. **Unverified Email Write**: Signed-in user with `email_verified: false` writing a community post -> DENIED.
6. **Oversized ID Poisoning**: Document ID > 128 chars or containing `/` or `$` -> DENIED by `isValidId()`.
7. **Timestamp Forgery**: Creating a VaultItem with backdated client timestamp instead of `serverTimestamp()` -> DENIED by `createdAt == request.time`.
8. **Immutable Ownership Tampering**: Updating an ExpenseRecord to change `ownerUid` or `createdAt` -> DENIED.
9. **Blanket User Profile Scraping**: User B calling `list` on `/users` -> DENIED (no `list` permission on `/users`).
10. **PII Leak in Community Board**: Attempting to add `email` field to `/communityPosts/{id}` -> DENIED by `keys().hasOnly(...)`.
11. **Oversized Message Poisoning**: Community post with 5,000-character message -> DENIED by `message.size() <= 400`.
12. **Unbounded Array Injection**: TripItinerary with 100 regions -> DENIED by `regions.size() <= 12`.
