export type ThemeMode = 'light' | 'dark' | 'auto';

export type AmbientMode = 'silent' | 'rain' | 'brown';

export type NavTab = 'library' | 'playlists' | 'offline' | 'sync';

export type VoiceProfileId =
  | 'natural'
  | 'young_female'
  | 'warm_female'
  | 'mature_female'
  | 'deep_male'
  | 'young_male'
  | 'elder_storyteller'
  | 'horror_dark'
  | 'sleep_calm'
  | 'crisp_story';

export interface OfflineVoiceProfile {
  id: VoiceProfileId;
  label: string;
  description: string;
  pitch: number;
  rateScale: number;
  preferredGender?: 'female' | 'male';
}

export const OFFLINE_VOICE_PROFILES: OfflineVoiceProfile[] = [
  {
    id: 'natural',
    label: 'Chuẩn tự nhiên (Tiếng Việt · Offline)',
    description: 'Giọng Việt cân bằng, rõ chữ, phù hợp mọi thể loại',
    pitch: 1.0,
    rateScale: 1.0,
  },
  {
    id: 'young_female',
    label: 'Nữ trẻ trong sáng (Tiếng Việt · Offline)',
    description: 'Giọng nữ cao thanh, tươi trẻ hợp Đô thị, Học đường & Ngôn tình',
    pitch: 1.24,
    rateScale: 1.03,
    preferredGender: 'female',
  },
  {
    id: 'warm_female',
    label: 'Nữ dịu dàng truyền cảm (Tiếng Việt · Offline)',
    description: 'Mềm mại, giàu cảm xúc cho Ngôn tình & Tình cảm',
    pitch: 1.12,
    rateScale: 0.96,
    preferredGender: 'female',
  },
  {
    id: 'mature_female',
    label: 'Nữ trưởng thành điềm tĩnh (Tiếng Việt · Offline)',
    description: 'Đĩnh đạc, mạch lạc cho Trinh thám, Lịch sử & Tâm lý',
    pitch: 1.02,
    rateScale: 0.95,
    preferredGender: 'female',
  },
  {
    id: 'deep_male',
    label: 'Nam trầm ấm (Tiếng Việt · Offline)',
    description: 'Giọng nam trầm dày, uy lực cho Kiếm hiệp & Tiên hiệp',
    pitch: 0.78,
    rateScale: 0.95,
    preferredGender: 'male',
  },
  {
    id: 'young_male',
    label: 'Nam trẻ năng động (Tiếng Việt · Offline)',
    description: 'Sáng rõ, dứt khoát cho Đô thị, Huyền huyễn & Khoa huyễn',
    pitch: 0.93,
    rateScale: 1.05,
    preferredGender: 'male',
  },
  {
    id: 'elder_storyteller',
    label: 'Ông lão kể chuyện cổ (Tiếng Việt · Offline)',
    description: 'Khàn trầm, chậm rãi đầy chiêm nghiệm cho Cổ trang & Lịch sử',
    pitch: 0.68,
    rateScale: 0.86,
    preferredGender: 'male',
  },
  {
    id: 'horror_dark',
    label: 'Đêm khuya ma mị (Tiếng Việt · Offline)',
    description: 'Trầm lạnh, nhịp chậm tạo không khí Kinh dị & Linh dị',
    pitch: 0.72,
    rateScale: 0.88,
    preferredGender: 'male',
  },
  {
    id: 'sleep_calm',
    label: 'Ru ngủ êm dịu (Tiếng Việt · Offline)',
    description: 'Nhịp đọc nhẹ nhàng, khoan thai nghe thư giãn ban đêm',
    pitch: 1.06,
    rateScale: 0.88,
    preferredGender: 'female',
  },
  {
    id: 'crisp_story',
    label: 'Tóm tắt nhịp nhanh (Tiếng Việt · Offline)',
    description: 'Sáng rõ, tiết tấu nhanh gọn để nghe lướt chương dài',
    pitch: 1.04,
    rateScale: 1.14,
  },
];

export type EqPresetId = 'flat' | 'voice' | 'bass_boost' | 'treble_boost' | 'night' | 'custom';

export interface EqBandConfig {
  frequency: number;
  label: string;
  shortLabel: string;
  type: BiquadFilterType;
}

export const EQ_BANDS: EqBandConfig[] = [
  { frequency: 60, label: '60 Hz', shortLabel: 'Bass', type: 'lowshelf' },
  { frequency: 230, label: '230 Hz', shortLabel: 'Trầm', type: 'peaking' },
  { frequency: 910, label: '910 Hz', shortLabel: 'Giọng', type: 'peaking' },
  { frequency: 3600, label: '3.6 kHz', shortLabel: 'Rõ', type: 'peaking' },
  { frequency: 14000, label: '14 kHz', shortLabel: 'Treble', type: 'highshelf' },
];

export interface EqPreset {
  id: Exclude<EqPresetId, 'custom'>;
  label: string;
  gains: [number, number, number, number, number];
}

export const EQ_PRESETS: EqPreset[] = [
  { id: 'flat', label: 'Cân bằng', gains: [0, 0, 0, 0, 0] },
  { id: 'voice', label: 'Giọng nói', gains: [-3, 1, 5, 4, 1] },
  { id: 'bass_boost', label: 'Tăng Bass', gains: [6, 4, 0, -1, 0] },
  { id: 'treble_boost', label: 'Tăng Treble', gains: [0, 0, 1, 4, 6] },
  { id: 'night', label: 'Nghe đêm', gains: [-2, 2, 2, -2, -4] },
];

export interface ChapterSummary {
  id: string;
  index: number;
  title: string;
  charCount: number;
  hasAudioBlob?: boolean;
  downloadedOffline: boolean;
  sizeBytes: number;
  updatedAt: number;
}

export const STORY_GENRES = [
  'Kinh dị',
  'Tình cảm',
  'Kiếm hiệp',
  'Tiên hiệp',
  'Ngôn tình',
  'Trinh thám',
  'Huyền huyễn',
  'Đô thị',
  'Khoa huyễn',
  'Lịch sử',
  'Khác',
] as const;

export interface Story {
  id: string;
  title: string;
  author?: string;
  genre?: string;
  cover?: string;
  chapters: ChapterSummary[];
  createdAt: number;
  updatedAt: number;
  syncedAt?: number;
  cloudOnly?: boolean;
}

export interface ChapterContent {
  id: string;
  storyId: string;
  index: number;
  title: string;
  text: string;
  charCount: number;
  audioBlob?: Blob;
  audioMime?: string;
  audioDuration?: number;
  downloadedOffline: boolean;
  sizeBytes: number;
  updatedAt: number;
}

export interface TextChunk {
  t: string;
  p: number;
}

export interface ListeningProgress {
  storyId: string;
  chapterIndex: number;
  chunkIndex: number;
  audioTime: number;
  totalChunks: number;
  chapterTitle?: string;
  deviceName?: string;
  updatedAt: number;
}

export interface PlaylistItem {
  storyId: string;
  chapterIndex: number;
  storyTitle: string;
  chapterTitle: string;
}

export interface Playlist {
  id: string;
  name: string;
  description?: string;
  items: PlaylistItem[];
  createdAt: number;
  updatedAt: number;
}

export interface SyncQueueItem {
  id: string;
  kind: 'story' | 'delete_story' | 'progress' | 'playlist' | 'delete_playlist';
  targetId: string;
  createdAt: number;
}

export interface PlaybackContext {
  mode: 'story' | 'playlist';
  playlistId?: string;
  playlistIndex?: number;
}
