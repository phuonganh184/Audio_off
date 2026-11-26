export type ThemeMode = 'light' | 'dark' | 'auto';

export type AmbientMode = 'silent' | 'rain' | 'brown';

export type NavTab = 'library' | 'playlists' | 'stats' | 'offline' | 'sync';

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
  aiGenderLabel: 'Nữ Việt' | 'Nam Việt';
  aiVoiceName: 'Kore' | 'Zephyr' | 'Charon' | 'Fenrir' | 'Puck';
  aiStyle: string;
}

export const OFFLINE_VOICE_PROFILES: OfflineVoiceProfile[] = [
  {
    id: 'natural',
    label: 'Nữ chuẩn tự nhiên (Tiếng Việt)',
    description: 'Giọng nữ Việt cân bằng, rõ chữ, phù hợp mọi thể loại',
    pitch: 1.15,
    rateScale: 1.0,
    preferredGender: 'female',
    aiGenderLabel: 'Nữ Việt',
    aiVoiceName: 'Kore',
    aiStyle:
      'Vietnamese female audiobook narrator, natural clear standard Vietnamese pronunciation, balanced storytelling tone',
  },
  {
    id: 'young_female',
    label: 'Nữ trẻ trong sáng (Tiếng Việt)',
    description: 'Giọng nữ cao thanh, tươi trẻ hợp Đô thị, Học đường & Ngôn tình',
    pitch: 1.45,
    rateScale: 1.03,
    preferredGender: 'female',
    aiGenderLabel: 'Nữ Việt',
    aiVoiceName: 'Zephyr',
    aiStyle:
      'Vietnamese young female audiobook narrator, bright gentle youthful clear tone, natural Vietnamese pronunciation',
  },
  {
    id: 'warm_female',
    label: 'Nữ dịu dàng truyền cảm (Tiếng Việt)',
    description: 'Mềm mại, giàu cảm xúc cho Ngôn tình & Tình cảm',
    pitch: 1.28,
    rateScale: 0.96,
    preferredGender: 'female',
    aiGenderLabel: 'Nữ Việt',
    aiVoiceName: 'Kore',
    aiStyle:
      'Vietnamese female audiobook narrator, warm affectionate emotional storytelling tone, soft natural Vietnamese pacing',
  },
  {
    id: 'mature_female',
    label: 'Nữ trưởng thành điềm tĩnh (Tiếng Việt)',
    description: 'Đĩnh đạc, mạch lạc cho Trinh thám, Lịch sử & Tâm lý',
    pitch: 1.15,
    rateScale: 0.95,
    preferredGender: 'female',
    aiGenderLabel: 'Nữ Việt',
    aiVoiceName: 'Kore',
    aiStyle:
      'Vietnamese mature female audiobook narrator, poised composed steady tone, crisp Vietnamese articulation',
  },
  {
    id: 'deep_male',
    label: 'Nam trầm ấm (Tiếng Việt)',
    description: 'Giọng nam trầm dày, uy lực cho Kiếm hiệp & Tiên hiệp',
    pitch: 0.72,
    rateScale: 0.95,
    preferredGender: 'male',
    aiGenderLabel: 'Nam Việt',
    aiVoiceName: 'Charon',
    aiStyle:
      'Vietnamese male audiobook narrator, deep resonant authoritative storytelling tone for wuxia and fantasy, natural Vietnamese pronunciation',
  },
  {
    id: 'young_male',
    label: 'Nam trẻ năng động (Tiếng Việt)',
    description: 'Sáng rõ, dứt khoát cho Đô thị, Huyền huyễn & Khoa huyễn',
    pitch: 0.9,
    rateScale: 1.05,
    preferredGender: 'male',
    aiGenderLabel: 'Nam Việt',
    aiVoiceName: 'Puck',
    aiStyle:
      'Vietnamese young male audiobook narrator, crisp bright clear energetic modern tone, natural Vietnamese pronunciation',
  },
  {
    id: 'elder_storyteller',
    label: 'Ông lão kể chuyện cổ (Tiếng Việt)',
    description: 'Khàn trầm, chậm rãi đầy chiêm nghiệm cho Cổ trang & Lịch sử',
    pitch: 0.62,
    rateScale: 0.86,
    preferredGender: 'male',
    aiGenderLabel: 'Nam Việt',
    aiVoiceName: 'Fenrir',
    aiStyle:
      'Vietnamese elder male storyteller, deep seasoned wise unhurried historical storytelling voice, natural Vietnamese',
  },
  {
    id: 'horror_dark',
    label: 'Nam đêm khuya ma mị (Tiếng Việt)',
    description: 'Trầm lạnh, nhịp chậm tạo không khí Kinh dị & Linh dị',
    pitch: 0.66,
    rateScale: 0.88,
    preferredGender: 'male',
    aiGenderLabel: 'Nam Việt',
    aiVoiceName: 'Charon',
    aiStyle:
      'Vietnamese male audiobook narrator, low hushed suspenseful dark horror storytelling tone, deliberate pacing',
  },
  {
    id: 'sleep_calm',
    label: 'Nữ ru ngủ êm dịu (Tiếng Việt)',
    description: 'Nhịp đọc nhẹ nhàng, khoan thai nghe thư giãn ban đêm',
    pitch: 1.22,
    rateScale: 0.88,
    preferredGender: 'female',
    aiGenderLabel: 'Nữ Việt',
    aiVoiceName: 'Zephyr',
    aiStyle:
      'Vietnamese female narrator, very soft soothing calming bedtime story voice, slow gentle relaxing pace',
  },
  {
    id: 'crisp_story',
    label: 'Nam tóm tắt nhịp nhanh (Tiếng Việt)',
    description: 'Sáng rõ, tiết tấu nhanh gọn để nghe lướt chương dài',
    pitch: 1.0,
    rateScale: 1.14,
    preferredGender: 'male',
    aiGenderLabel: 'Nam Việt',
    aiVoiceName: 'Puck',
    aiStyle:
      'Vietnamese male narrator, clear articulate brisk well-paced storytelling voice',
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
  { frequency: 110, label: '110 Hz', shortLabel: 'Bass', type: 'lowshelf' },
  { frequency: 280, label: '280 Hz', shortLabel: 'Trầm', type: 'peaking' },
  { frequency: 1000, label: '1 kHz', shortLabel: 'Giọng', type: 'peaking' },
  { frequency: 3200, label: '3.2 kHz', shortLabel: 'Rõ', type: 'peaking' },
  { frequency: 7000, label: '7 kHz', shortLabel: 'Treble', type: 'highshelf' },
];

export interface EqPreset {
  id: Exclude<EqPresetId, 'custom'>;
  label: string;
  gains: [number, number, number, number, number];
}

export const EQ_PRESETS: EqPreset[] = [
  { id: 'flat', label: 'Cân bằng', gains: [0, 0, 0, 0, 0] },
  { id: 'voice', label: 'Giọng nói', gains: [-5, -1, 6, 5, 1] },
  { id: 'bass_boost', label: 'Tăng Bass', gains: [8, 5, -1, -2, -1] },
  { id: 'treble_boost', label: 'Tăng Treble', gains: [-2, -1, 1, 5, 8] },
  { id: 'night', label: 'Nghe đêm', gains: [-3, 3, 2, -3, -6] },
];

export type AudioFilterPresetId = 'default' | 'clear_voice' | 'studio_warm' | 'story_hall' | 'custom';

export interface AdvancedAudioFilterState {
  preset: AudioFilterPresetId;
  /** 0 - 100: Khử nhiễu nền, lọc ù/rè & làm rõ dải giọng nói */
  denoising: number;
  /** 0 - 100: Độ vang không gian phòng cho giọng kể chuyện */
  reverb: number;
  /** Tự động tăng nổi bật giọng đọc và dịu bớt âm nền khi phát song song */
  voicePriority: boolean;
}

export interface AudioFilterPreset {
  id: Exclude<AudioFilterPresetId, 'custom'>;
  label: string;
  denoising: number;
  reverb: number;
  voicePriority: boolean;
}

export const AUDIO_FILTER_PRESETS: AudioFilterPreset[] = [
  { id: 'default', label: 'Mặc định', denoising: 0, reverb: 0, voicePriority: true },
  { id: 'clear_voice', label: 'Rõ giọng & Khử ồn', denoising: 55, reverb: 5, voicePriority: true },
  { id: 'studio_warm', label: 'Phòng thu ấm', denoising: 40, reverb: 22, voicePriority: true },
  { id: 'story_hall', label: 'Kể chuyện có vang', denoising: 30, reverb: 48, voicePriority: true },
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

export const PLAYLIST_WHOLE_STORY_MARKER = 'Toàn bộ tập truyện';

export function isWholeStoryPlaylistItem(item: PlaylistItem): boolean {
  return item.chapterTitle === PLAYLIST_WHOLE_STORY_MARKER;
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

export interface NightScheduleConfig {
  enabled: boolean;
  startTime: string; // HH:MM (24h local time)
  endTime: string; // HH:MM (24h local time)
  enableDarkMode: boolean;
  enableBlueLightFilter: boolean;
}

export const DEFAULT_NIGHT_SCHEDULE: NightScheduleConfig = {
  enabled: false,
  startTime: '22:00',
  endTime: '06:00',
  enableDarkMode: true,
  enableBlueLightFilter: true,
};

export interface ChapterBookmark {
  id: string;
  storyId: string;
  storyTitle: string;
  chapterId: string;
  chapterIndex: number;
  chapterTitle: string;
  chunkIndex: number;
  audioTime: number;
  excerpt: string;
  note?: string;
  createdAt: number;
}

export type ReaderBgThemeId = 'default' | 'cream' | 'mint' | 'sky' | 'lavender' | 'peach';

export interface ReaderPastelTheme {
  id: ReaderBgThemeId;
  label: string;
  swatchHex: string;
  cardBgClass: string;
  proseTextClass: string;
  activeSentenceClass: string;
  activeWordClass: string;
}

export const READER_PASTEL_THEMES: ReaderPastelTheme[] = [
  {
    id: 'default',
    label: 'Mặc định',
    swatchHex: '#94a3b8',
    cardBgClass: 'bg-white dark:bg-[#1a1d24] border-slate-200 dark:border-slate-800',
    proseTextClass: 'text-slate-800 dark:text-slate-200',
    activeSentenceClass: 'bg-blue-500/18 dark:bg-blue-500/25 text-slate-950 dark:text-white',
    activeWordClass: 'bg-blue-600 text-white dark:bg-blue-400 dark:text-slate-950',
  },
  {
    id: 'cream',
    label: 'Kem ấm',
    swatchHex: '#F7EED3',
    cardBgClass: 'bg-[#FDF6E3] border-[#EAE0C5]',
    proseTextClass: 'text-[#3D3126]',
    activeSentenceClass: 'bg-[#E9DCBA]/75 text-[#261D14]',
    activeWordClass: 'bg-[#9A5B13] text-[#FFFDF7]',
  },
  {
    id: 'mint',
    label: 'Bạc hà',
    swatchHex: '#D8F1E5',
    cardBgClass: 'bg-[#EBF7F1] border-[#CBE7D9]',
    proseTextClass: 'text-[#1B3A2F]',
    activeSentenceClass: 'bg-[#C4E8D7]/80 text-[#0F261E]',
    activeWordClass: 'bg-[#11694B] text-white',
  },
  {
    id: 'sky',
    label: 'Xanh trời',
    swatchHex: '#DCEBFA',
    cardBgClass: 'bg-[#EDF4FC] border-[#CFE0F5]',
    proseTextClass: 'text-[#1D3048]',
    activeSentenceClass: 'bg-[#C7DEF8]/85 text-[#0F1E32]',
    activeWordClass: 'bg-[#1D5FBF] text-white',
  },
  {
    id: 'lavender',
    label: 'Oải hương',
    swatchHex: '#E8E0F7',
    cardBgClass: 'bg-[#F3EFFB] border-[#DDD3F2]',
    proseTextClass: 'text-[#2F2544]',
    activeSentenceClass: 'bg-[#DDD1F5]/85 text-[#1E1530]',
    activeWordClass: 'bg-[#5E3DA8] text-white',
  },
  {
    id: 'peach',
    label: 'Hồng đào',
    swatchHex: '#FCE2DA',
    cardBgClass: 'bg-[#FDF0EC] border-[#F1D4CB]',
    proseTextClass: 'text-[#422823]',
    activeSentenceClass: 'bg-[#F7CFC4]/80 text-[#2B1713]',
    activeWordClass: 'bg-[#B3432E] text-white',
  },
];



