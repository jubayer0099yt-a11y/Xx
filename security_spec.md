# Security Specification — JUBAYER Inbox (`/messages` & `/admins`)

## 1. Data Invariants
- Every document in `/messages/{messageId}` must have a safe ID matching `^[a-zA-Z0-9_-]+$` (`<= 128` chars) and contain strictly `name` (2–80 chars), `email` (5–120 chars matching email regex), `message` (10–1500 chars), `status` (`"unread"` on creation, `"unread"` or `"read"` on update), and server-verified `createdAt == request.time`.
- Visitors can only `create` messages with `status == "unread"`; they cannot `get`, `list`, `update`, or `delete` any message (protecting sender PII).
- Only the verified Admin (`request.auth.token.email == 'jubayer0099yt@gmail.com'` with `email_verified == true`, or an existing `/admins/{uid}` record for single-doc operations) can `get`, `list`, `update` (`status` + `updatedAt` only), or `delete` messages.
- `name`, `email`, `message`, and `createdAt` are immutable after creation.
- `/admins/{adminUid}` can only be created/read/updated by the verified bootstrap admin matching `request.auth.uid == adminUid`; listing or deleting `/admins` is denied.

## 2. Adversarial Payloads Tested ("Dirty Dozen")
1. **Shadow/Ghost Field Injection on Create**: `{ name, email, message, status: "unread", createdAt: serverTimestamp, isAdmin: true }` -> `PERMISSION_DENIED`.
2. **Status Spoofing on Create**: `{ name, email, message, status: "read", createdAt: serverTimestamp }` -> `PERMISSION_DENIED`.
3. **Forged Timestamp on Create**: `{ name, email, message, status: "unread", createdAt: "2020-01-01T00:00:00Z" }` -> `PERMISSION_DENIED`.
4. **Oversized/Poisoned Document ID**: `messages/${"a".repeat(200)}` -> `PERMISSION_DENIED`.
5. **Oversized Message / Denial of Wallet**: `{ name, email, message: "x".repeat(5000), status: "unread", createdAt: serverTimestamp }` -> `PERMISSION_DENIED`.
6. **Invalid Email Format**: `{ name: "Test", email: "not-an-email", message: "Hello there testing", status: "unread", createdAt: serverTimestamp }` -> `PERMISSION_DENIED`.
7. **Unauthenticated List/Get PII Scrape**: Visitor `getDocs(collection(db, "messages"))` or `getDoc(doc(db, "messages", id))` -> `PERMISSION_DENIED`.
8. **Non-Admin Authenticated User Read/Delete**: Signed-in user `other@gmail.com` attempting `list`, `get`, `update`, or `delete` on `/messages` -> `PERMISSION_DENIED`.
9. **Unverified Admin Email Spoof**: Signed-in user with `email: "jubayer0099yt@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
10. **Admin Self-Escalation by Attacker**: Non-admin authenticated user writing `/admins/{theirUid}` -> `PERMISSION_DENIED`.
11. **Content Tampering on Update**: Updating `message` or `email` or `createdAt` during status toggle -> `PERMISSION_DENIED`.
12. **Blank/Invalid Name or Message**: `name: "A"` or `message: "short"` -> `PERMISSION_DENIED`.
