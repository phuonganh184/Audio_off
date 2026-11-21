import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import {
  deletePlaylistLocal,
  deleteStoryLocal,
  getAllPlaylists,
  getAllProgress,
  getAllStories,
  getChapterContent,
  getStoryChapters,
  getSyncQueue,
  putChapterContent,
  putPlaylist,
  putProgress,
  putStory,
  removeSyncQueueItem,
} from '@/src/lib/localDb';
import type {
  ChapterContent,
  ChapterSummary,
  ListeningProgress,
  Playlist,
  Story,
  ThemeMode,
} from '@/src/types';

function validDocId(id: string): string {
  return id.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 120) || `id_${Date.now()}`;
}

export async function ensureUserProfile(
  user: User,
  prefs: { theme: ThemeMode; speechRate: number; preferredVoice?: string }
): Promise<void> {
  const path = `users/${user.uid}`;
  const ref = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        displayName: (user.displayName || user.email || 'Người nghe').slice(0, 120),
        theme: prefs.theme,
        speechRate: Math.min(3, Math.max(0.5, prefs.speechRate || 1)),
        preferredVoice: (prefs.preferredVoice || '').slice(0, 160),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        displayName: (user.displayName || user.email || 'Người nghe').slice(0, 120),
        theme: prefs.theme,
        speechRate: Math.min(3, Math.max(0.5, prefs.speechRate || 1)),
        preferredVoice: (prefs.preferredVoice || '').slice(0, 160),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function pushStoryAndChapters(uid: string, story: Story): Promise<void> {
  const storyId = validDocId(story.id);
  const storyPath = `users/${uid}/stories/${storyId}`;
  const storyRef = doc(db, 'users', uid, 'stories', storyId);

  try {
    const existing = await getDoc(storyRef);
    const basePayload = {
      id: storyId,
      ownerId: uid,
      title: story.title.slice(0, 200) || 'Không tiêu đề',
      ...(story.author ? { author: story.author.slice(0, 120) } : {}),
      ...(story.cover && story.cover.length <= 245000 ? { cover: story.cover } : {}),
      chapterCount: Math.min(10000, story.chapters.length),
    };

    if (!existing.exists()) {
      await setDoc(storyRef, {
        ...basePayload,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(storyRef, {
        title: basePayload.title,
        ...(basePayload.author !== undefined ? { author: basePayload.author } : {}),
        ...(basePayload.cover !== undefined ? { cover: basePayload.cover } : {}),
        chapterCount: basePayload.chapterCount,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, storyPath);
  }

  const localChapters = await getStoryChapters(story.id);
  for (const ch of localChapters) {
    const chId = validDocId(ch.id);
    const chPath = `users/${uid}/stories/${storyId}/chapters/${chId}`;
    const chRef = doc(db, 'users', uid, 'stories', storyId, 'chapters', chId);
    const safeText = ch.text.slice(0, 595000) || ' ';
    try {
      const existingCh = await getDoc(chRef);
      if (!existingCh.exists()) {
        await setDoc(chRef, {
          id: chId,
          ownerId: uid,
          storyId,
          index: ch.index,
          title: ch.title.slice(0, 200) || `Chương ${ch.index + 1}`,
          text: safeText,
          charCount: safeText.length,
          updatedAt: serverTimestamp(),
        });
      } else {
        await updateDoc(chRef, {
          index: ch.index,
          title: ch.title.slice(0, 200) || `Chương ${ch.index + 1}`,
          text: safeText,
          charCount: safeText.length,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, chPath);
    }
  }
}

export async function deleteStoryFromCloud(uid: string, storyId: string): Promise<void> {
  const safeStoryId = validDocId(storyId);
  const chaptersColPath = `users/${uid}/stories/${safeStoryId}/chapters`;
  try {
    const chQuery = query(
      collection(db, 'users', uid, 'stories', safeStoryId, 'chapters'),
      where('ownerId', '==', uid)
    );
    const chSnap = await getDocs(chQuery);
    for (const d of chSnap.docs) {
      await deleteDoc(d.ref);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, chaptersColPath);
  }

  const storyPath = `users/${uid}/stories/${safeStoryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'stories', safeStoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, storyPath);
  }

  const progPath = `users/${uid}/progress/${safeStoryId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'progress', safeStoryId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, progPath);
  }
}

export async function pushProgressToCloud(uid: string, progress: ListeningProgress): Promise<void> {
  const storyId = validDocId(progress.storyId);
  const path = `users/${uid}/progress/${storyId}`;
  const ref = doc(db, 'users', uid, 'progress', storyId);
  try {
    const existing = await getDoc(ref);
    const fields = {
      chapterIndex: Math.max(0, Math.floor(progress.chapterIndex)),
      chunkIndex: Math.max(0, Math.floor(progress.chunkIndex)),
      audioTime: Math.max(0, Math.min(86400, Number(progress.audioTime) || 0)),
      totalChunks: Math.max(0, Math.floor(progress.totalChunks || 0)),
      ...(progress.chapterTitle ? { chapterTitle: progress.chapterTitle.slice(0, 200) } : {}),
      ...(progress.deviceName ? { deviceName: progress.deviceName.slice(0, 120) } : {}),
      updatedAt: serverTimestamp(),
    };
    if (!existing.exists()) {
      await setDoc(ref, {
        storyId,
        ownerId: uid,
        ...fields,
      });
    } else {
      await updateDoc(ref, fields);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function pushPlaylistToCloud(uid: string, playlist: Playlist): Promise<void> {
  const playlistId = validDocId(playlist.id);
  const path = `users/${uid}/playlists/${playlistId}`;
  const ref = doc(db, 'users', uid, 'playlists', playlistId);

  const safeItems = playlist.items.slice(0, 200).map((it) => ({
    storyId: validDocId(it.storyId),
    chapterIndex: Math.max(0, Math.floor(it.chapterIndex)),
    storyTitle: (it.storyTitle || 'Truyện').slice(0, 200),
    chapterTitle: (it.chapterTitle || 'Chương').slice(0, 200),
  }));

  try {
    const existing = await getDoc(ref);
    if (!existing.exists()) {
      await setDoc(ref, {
        id: playlistId,
        ownerId: uid,
        name: playlist.name.slice(0, 120) || 'Danh sách phát',
        ...(playlist.description ? { description: playlist.description.slice(0, 300) } : {}),
        items: safeItems,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(ref, {
        name: playlist.name.slice(0, 120) || 'Danh sách phát',
        ...(playlist.description !== undefined
          ? { description: playlist.description.slice(0, 300) }
          : {}),
        items: safeItems,
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deletePlaylistFromCloud(uid: string, playlistId: string): Promise<void> {
  const safeId = validDocId(playlistId);
  const path = `users/${uid}/playlists/${safeId}`;
  try {
    await deleteDoc(doc(db, 'users', uid, 'playlists', safeId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function downloadChapterFromCloud(
  uid: string,
  storyId: string,
  chapterId: string
): Promise<ChapterContent | null> {
  const safeStoryId = validDocId(storyId);
  const safeChId = validDocId(chapterId);
  const path = `users/${uid}/stories/${safeStoryId}/chapters/${safeChId}`;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'stories', safeStoryId, 'chapters', safeChId));
    if (!snap.exists()) return null;
    const data = snap.data();
    const content: ChapterContent = {
      id: data.id,
      storyId: data.storyId,
      index: data.index,
      title: data.title,
      text: data.text,
      charCount: data.charCount || data.text.length,
      downloadedOffline: true,
      sizeBytes: new Blob([data.text]).size,
      updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now(),
    };
    await putChapterContent(content);
    return content;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function syncAllWithCloud(
  uid: string,
  user: User,
  prefs: { theme: ThemeMode; speechRate: number; preferredVoice?: string },
  onStatus?: (msg: string) => void
): Promise<{
  storiesCount: number;
  playlistsCount: number;
  progressUpdated: number;
}> {
  onStatus?.('Đang xác thực hồ sơ đồng bộ…');
  await ensureUserProfile(user, prefs);

  // 1. Flush any pending offline queue items first
  const queue = await getSyncQueue();
  const localStories = await getAllStories();
  const localPlaylists = await getAllPlaylists();
  const localProgress = await getAllProgress();

  for (const item of queue) {
    if (item.kind === 'story') {
      const s = localStories.find((x) => x.id === item.targetId);
      if (s) await pushStoryAndChapters(uid, s);
    } else if (item.kind === 'delete_story') {
      await deleteStoryFromCloud(uid, item.targetId);
    } else if (item.kind === 'progress') {
      const p = localProgress[item.targetId];
      if (p) await pushProgressToCloud(uid, p);
    } else if (item.kind === 'playlist') {
      const pl = localPlaylists.find((x) => x.id === item.targetId);
      if (pl) await pushPlaylistToCloud(uid, pl);
    } else if (item.kind === 'delete_playlist') {
      await deletePlaylistFromCloud(uid, item.targetId);
    }
    await removeSyncQueueItem(item.id);
  }

  // 2. Push local-only stories that have never been synced
  for (const s of localStories) {
    if (!s.syncedAt && !s.cloudOnly) {
      onStatus?.(`Đang tải lên “${s.title}”…`);
      await pushStoryAndChapters(uid, s);
      await putStory({ ...s, syncedAt: Date.now() });
    }
  }

  // Push any local-only playlists
  const cloudPlaylistsPath = `users/${uid}/playlists`;
  const getPlaylistsSnap = async (): Promise<QuerySnapshot<DocumentData>> => {
    try {
      return await getDocs(
        query(collection(db, 'users', uid, 'playlists'), where('ownerId', '==', uid))
      );
    } catch (error) {
      return handleFirestoreError(error, OperationType.LIST, cloudPlaylistsPath);
    }
  };

  let cloudPlaylistsSnap = await getPlaylistsSnap();

  const cloudPlaylistIds = new Set(cloudPlaylistsSnap.docs.map((d) => d.id));
  for (const pl of localPlaylists) {
    if (!cloudPlaylistIds.has(validDocId(pl.id))) {
      await pushPlaylistToCloud(uid, pl);
    }
  }

  // Re-fetch cloud playlists & merge (newest updatedAt wins)
  cloudPlaylistsSnap = await getPlaylistsSnap();

  for (const d of cloudPlaylistsSnap.docs) {
    const data = d.data();
    const cloudTime = data.updatedAt?.toMillis ? data.updatedAt.toMillis() : Date.now();
    const localPl = localPlaylists.find((x) => validDocId(x.id) === d.id);
    if (!localPl || cloudTime >= localPl.updatedAt) {
      await putPlaylist({
        id: data.id,
        name: data.name,
        description: data.description,
        items: data.items || [],
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now(),
        updatedAt: cloudTime,
      });
    } else {
      await pushPlaylistToCloud(uid, localPl);
    }
  }

  // 3. Pull cloud stories metadata and chapter list (on-demand download!)
  onStatus?.('Đang kiểm tra thư viện trên đám mây…');
  const storiesPath = `users/${uid}/stories`;
  let cloudStoriesSnap: QuerySnapshot<DocumentData>;
  try {
    cloudStoriesSnap = await getDocs(
      query(collection(db, 'users', uid, 'stories'), where('ownerId', '==', uid))
    );
  } catch (error) {
    cloudStoriesSnap = handleFirestoreError(error, OperationType.LIST, storiesPath);
  }

  for (const sDoc of cloudStoriesSnap.docs) {
    const sData = sDoc.data();
    const chPath = `users/${uid}/stories/${sDoc.id}/chapters`;
    let chSnap: QuerySnapshot<DocumentData>;
    try {
      chSnap = await getDocs(
        query(collection(db, 'users', uid, 'stories', sDoc.id, 'chapters'), where('ownerId', '==', uid))
      );
    } catch (error) {
      chSnap = handleFirestoreError(error, OperationType.LIST, chPath);
    }

    const existingChapters = await getStoryChapters(sData.id);
    const localChMap = new Map(existingChapters.map((c) => [c.id, c]));

    const summaries: ChapterSummary[] = [];
    for (const cDoc of chSnap.docs) {
      const cData = cDoc.data();
      const localCh = localChMap.get(cData.id);
      summaries.push({
        id: cData.id,
        index: cData.index,
        title: cData.title,
        charCount: cData.charCount || 0,
        hasAudioBlob: !!localCh?.audioBlob,
        downloadedOffline: !!localCh?.downloadedOffline,
        sizeBytes: localCh?.sizeBytes || (cData.charCount || 0),
        updatedAt: cData.updatedAt?.toMillis ? cData.updatedAt.toMillis() : Date.now(),
      });
    }
    summaries.sort((a, b) => a.index - b.index);

    const storyObj: Story = {
      id: sData.id,
      title: sData.title,
      author: sData.author,
      cover: sData.cover,
      chapters: summaries,
      createdAt: sData.createdAt?.toMillis ? sData.createdAt.toMillis() : Date.now(),
      updatedAt: sData.updatedAt?.toMillis ? sData.updatedAt.toMillis() : Date.now(),
      syncedAt: Date.now(),
      cloudOnly: summaries.length > 0 && summaries.every((c) => !c.downloadedOffline),
    };
    await putStory(storyObj);
  }

  // 4. Sync listening progress (newest timestamp wins between devices!)
  onStatus?.('Đang đồng bộ tiến trình nghe đa thiết bị…');
  const progPath = `users/${uid}/progress`;
  let progSnap: QuerySnapshot<DocumentData>;
  try {
    progSnap = await getDocs(
      query(collection(db, 'users', uid, 'progress'), where('ownerId', '==', uid))
    );
  } catch (error) {
    progSnap = handleFirestoreError(error, OperationType.LIST, progPath);
  }

  let progressUpdated = 0;
  const cloudProgMap = new Map<string, ListeningProgress>();
  for (const pDoc of progSnap.docs) {
    const pData = pDoc.data();
    cloudProgMap.set(pData.storyId, {
      storyId: pData.storyId,
      chapterIndex: pData.chapterIndex,
      chunkIndex: pData.chunkIndex,
      audioTime: pData.audioTime || 0,
      totalChunks: pData.totalChunks || 0,
      chapterTitle: pData.chapterTitle,
      deviceName: pData.deviceName,
      updatedAt: pData.updatedAt?.toMillis ? pData.updatedAt.toMillis() : Date.now(),
    });
  }

  for (const [sid, cProg] of cloudProgMap.entries()) {
    const lProg = localProgress[sid];
    if (!lProg || cProg.updatedAt > lProg.updatedAt) {
      await putProgress(cProg);
      progressUpdated++;
    } else if (lProg.updatedAt > cProg.updatedAt) {
      await pushProgressToCloud(uid, lProg);
    }
  }

  for (const [sid, lProg] of Object.entries(localProgress)) {
    if (!cloudProgMap.has(sid)) {
      await pushProgressToCloud(uid, lProg);
    }
  }

  return {
    storiesCount: cloudStoriesSnap.size,
    playlistsCount: cloudPlaylistsSnap.size,
    progressUpdated,
  };
}

export { deletePlaylistLocal, deleteStoryLocal, getChapterContent };
