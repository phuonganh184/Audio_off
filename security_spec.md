# Security Specification — Truyện Audio

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document under `/users/{userId}` and its subcollections (`stories`, `chapters`, `progress`, `playlists`) is strictly private to the authenticated, email-verified user whose `request.auth.uid == userId`.
2. **Master Gate Parent Existence**:
   - Stories, progress records, and playlists cannot be created unless the parent `/users/{userId}` profile document exists.
   - Chapters cannot be created unless both `/users/{userId}` and `/users/{userId}/stories/{storyId}` exist.
3. **Identity Integrity**: Every document's `uid` or `ownerId` field must match `request.auth.uid` on creation and remain immutable on update. Document IDs (`storyId`, `chapterId`, `playlistId`) must match `^[a-zA-Z0-9_-]+$` (<= 128 chars) and match the corresponding `id` / `storyId` payload field.
4. **Temporal Integrity**: `createdAt` and `updatedAt` must equal `request.time`; `createdAt` is immutable on update.
5. **Bounded Payload Sizes**: Strings (`title`, `text`, `cover`, `name`, `description`) and arrays (`Playlist.items` <= 200 items) enforce strict length limits to prevent Denial-of-Wallet resource exhaustion.
6. **Zero Shadow Fields**: `keys().hasAll(...)` + `keys().hasOnly(...)` on creation and `affectedKeys().hasOnly(...)` on update block all unapproved properties.

## 2. The "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Story Read/Write**: Unauthenticated user attempts `get` or `create` on `/users/userA/stories/s1`.
2. **Cross-User Access**: Authenticated `userB` attempts `get`, `list`, or `write` on `/users/userA/stories/s1`.
3. **Unverified Email Spoof**: Authenticated user with `email_verified: false` attempts to write to `/users/userA`.
4. **Identity Spoofing on Create**: `userA` creates `/users/userA/stories/s1` with `ownerId: "userB"`.
5. **Shadow Field Injection**: `userA` creates `/users/userA/stories/s1` with an extra ghost field `{ isVerified: true }`.
6. **Orphaned Chapter Creation**: `userA` creates `/users/userA/stories/nonexistent/chapters/c1` when parent story does not exist.
7. **Path-ID Poisoning**: `userA` writes to `/users/userA/stories/invalid$id/../hack` (fails `isValidId`).
8. **Client Timestamp Forgery**: `userA` writes `/users/userA/progress/s1` with a backdated `updatedAt: new Date(2020, 0, 1)` instead of `request.time`.
9. **Immutable Field Mutation**: `userA` updates `/users/userA/stories/s1` attempting to change `createdAt` or `ownerId`.
10. **Unbounded Playlist Array Overflow**: `userA` writes `/users/userA/playlists/p1` with 201 items in `items`.
11. **Malformed Playlist Item Type**: `userA` writes `/users/userA/playlists/p1` where `items[0].chapterIndex` is `"zero"` instead of an integer.
12. **Oversized Chapter Text Injection**: `userA` writes a chapter whose `text` exceeds 600,000 characters.
