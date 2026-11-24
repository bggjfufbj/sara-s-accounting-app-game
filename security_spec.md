# Security Specification — تەرازووی ژمێرییار (Firestore Rules)

## 1. Data Invariants
1. **Default Deny**: All unmatched paths in `/databases/{database}/documents` are denied (`allow read, write: if false`).
2. **Zero PII**: No collection stores `email`, `phone`, `address`, or personal identity fields.
3. **Published Shared Curriculum (`/curriculum_overrides/{questionId}`)**:
   - Readable (`get`, `list`) only when `resource.data.isPublished == true`.
   - Writable (`create`, `update`, `delete`) strictly by verified Admin (`request.auth.token.email_verified == true` and bootstrapped admin email `rawandhalabjay90@gmail.com` or `admins/{uid}` document).
   - `id` must match `{questionId}` and pass `isValidId()`.
   - `createdAt` and `updatedAt` must strictly equal `request.time` on create; `createdAt` and `ownerId` are immutable on update.
4. **Private Teacher Overrides (`/teacher_overrides/{docId}`)**:
   - Readable (`get`, `list`) and writable strictly by the verified owner (`request.auth.token.email_verified == true && resource.data.ownerId == request.auth.uid`).
   - `allow list` evaluates `resource.data.ownerId == request.auth.uid` directly with zero `get()`/`exists()` calls.
5. **Private Teacher Custom Questions (`/teacher_custom_questions/{docId}`)**:
   - Readable (`get`, `list`) and writable strictly by the verified owner (`resource.data.ownerId == request.auth.uid`).
   - Enforces strict `sortOrder` (`0..1000`), bounded strings, and allowlisted keys.
6. **Trusted Admin Registry (`/admins/{adminId}`)**:
   - Client writes are unconditionally denied (`allow write: if false`). Only the user themselves (verified) may `get` their own marker.

## 2. The "Dirty Dozen" Attack Payloads (All Must Return PERMISSION_DENIED)
1. **Unauthenticated Write to `/curriculum_overrides/cur-mcq-1`**: `auth: null` -> Denied (not signed in / not admin).
2. **Unverified Admin Email Spoof**: `auth: { uid: 'u1', email: 'rawandhalabjay90@gmail.com', email_verified: false }` -> Denied (`email_verified == true` required).
3. **Non-Admin Write to `/curriculum_overrides/cur-mcq-1`**: `auth: { uid: 'u2', email: 'other@example.com', email_verified: true }` -> Denied (not admin).
4. **Shadow/Ghost Field Injection on Create**: Valid admin payload + extra key `isAdmin: true` -> Denied (`hasOnly(...)` rejects shadow fields).
5. **Shadow/Ghost Field Injection on Update**: Valid owner update + extra key `ghostField: 1` -> Denied (`affectedKeys().hasOnly(...)` & validation helper reject).
6. **ID Poisoning**: Document ID of 200 characters or containing spaces/slashes (`../etc/passwd`) -> Denied (`isValidId()` rejects).
7. **Denial-of-Wallet Oversized String**: `explanation` with 5,000 characters (> 800 max) -> Denied (`.size() <= 800` rejects).
8. **Identity Spoofing**: User `u1` creating `/teacher_overrides/doc1` with `ownerId: 'u2'` -> Denied (`data.ownerId == request.auth.uid` rejects).
9. **Immortal Field Tampering**: Owner updating `createdAt` or `ownerId` -> Denied (`incoming().createdAt == existing().createdAt && incoming().ownerId == existing().ownerId`).
10. **Client-Forged Timestamp**: Sending `updatedAt: Timestamp(2020-01-01)` instead of `serverTimestamp()` -> Denied (`incoming().updatedAt == request.time`).
11. **Cross-Owner Read / List Scraping**: User `u2` attempting `get` or `list` of `/teacher_custom_questions` owned by `u1` -> Denied (`resource.data.ownerId == request.auth.uid`).
12. **Self-Assigned Admin Escalation**: Authenticated user writing `/admins/{uid}` with `{ role: 'admin' }` -> Denied (`allow write: if false`).
