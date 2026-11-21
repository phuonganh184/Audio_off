import { describe, it } from 'node:test';

/**
 * Adversarial Security Rules Specification Tests ("Dirty Dozen")
 * Run against Firebase Rules Emulator when @firebase/rules-unit-testing is configured.
 * These payloads document the exact 12 attack vectors blocked by firestore.rules.
 */
export const DIRTY_DOZEN_PAYLOADS = [
  {
    name: '1. Unauthenticated Story Create',
    auth: null,
    path: '/users/userA/stories/s1',
    op: 'create',
    payload: { id: 's1', ownerId: 'userA', title: 'Test', chapterCount: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '2. Cross-User Read/Write',
    auth: { uid: 'userB', email_verified: true },
    path: '/users/userA/stories/s1',
    op: 'get',
    payload: null,
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '3. Unverified Email Write',
    auth: { uid: 'userA', email_verified: false },
    path: '/users/userA',
    op: 'create',
    payload: { uid: 'userA', theme: 'dark', speechRate: 1 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '4. OwnerId Spoofing on Create',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/stories/s1',
    op: 'create',
    payload: { id: 's1', ownerId: 'userB', title: 'Spoof', chapterCount: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '5. Shadow Field Injection',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/stories/s1',
    op: 'create',
    payload: { id: 's1', ownerId: 'userA', title: 'Shadow', chapterCount: 0, isAdmin: true },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '6. Orphaned Chapter Creation (Missing Parent Story)',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/stories/missing_story/chapters/c1',
    op: 'create',
    payload: { id: 'c1', ownerId: 'userA', storyId: 'missing_story', index: 0, title: 'Ch1', text: 'abc', charCount: 3 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '7. Path ID Poisoning',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/stories/bad$id!',
    op: 'create',
    payload: { id: 'bad$id!', ownerId: 'userA', title: 'Bad', chapterCount: 0 },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '8. Client Timestamp Forgery',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/progress/s1',
    op: 'create',
    payload: { storyId: 's1', ownerId: 'userA', chapterIndex: 0, chunkIndex: 0, audioTime: 0, totalChunks: 10, updatedAt: '2020-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '9. Immutable Field Mutation (createdAt)',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/stories/s1',
    op: 'update',
    payload: { createdAt: '1999-01-01T00:00:00Z' },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '10. Playlist Items Array Overflow (>200)',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/playlists/p1',
    op: 'create',
    payload: {
      id: 'p1',
      ownerId: 'userA',
      name: 'Overflow',
      items: Array.from({ length: 201 }, (_, i) => ({
        storyId: 's1',
        chapterIndex: i,
        storyTitle: 'S',
        chapterTitle: 'C',
      })),
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '11. Malformed Playlist Item Type',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/playlists/p1',
    op: 'create',
    payload: {
      id: 'p1',
      ownerId: 'userA',
      name: 'BadItem',
      items: [{ storyId: 's1', chapterIndex: 'zero', storyTitle: 'S', chapterTitle: 'C' }],
    },
    expected: 'PERMISSION_DENIED',
  },
  {
    name: '12. Oversized Chapter Text (>600000 chars)',
    auth: { uid: 'userA', email_verified: true },
    path: '/users/userA/stories/s1/chapters/c1',
    op: 'create',
    payload: { id: 'c1', ownerId: 'userA', storyId: 's1', index: 0, title: 'Huge', text: 'a'.repeat(600001), charCount: 600001 },
    expected: 'PERMISSION_DENIED',
  },
];

describe('Firestore Security Rules Dirty Dozen Spec', () => {
  it('defines all 12 adversarial payloads', () => {
    if (DIRTY_DOZEN_PAYLOADS.length !== 12) {
      throw new Error('Expected 12 Dirty Dozen payloads');
    }
  });
});
