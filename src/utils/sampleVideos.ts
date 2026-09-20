import { SampleVideo } from '../types';

export const SAMPLE_VIDEOS: SampleVideo[] = [
  {
    id: 'cinema-dialogue-demo',
    title: 'Cinematic Dialogue & Soundtrack Test (4K)',
    description: 'High-contrast dialogue test with heavy background orchestration to verify voice clarity vs soundtrack separation.',
    duration: '0:52',
    resolution: '4K Ultra HD (3840x2160)',
    hasMultiChannel: true,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'nature-vocal-demo',
    title: 'Nature Documentary & Voiceover Demo (1080p 60fps)',
    description: 'Narrator speech over rushing waterfall and animal sounds - tests high-bitrate Opus speech encoding.',
    duration: '1:00',
    resolution: '1080p 60fps',
    hasMultiChannel: false,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'action-scifi-demo',
    title: 'Sci-Fi Action Trailer with Dynamic Range (4K)',
    description: 'Rapid shifts between quiet whispering and intense sound effects - tests Night Mode dynamic compressor.',
    duration: '0:48',
    resolution: '4K Ultra HD (3840x2160)',
    hasMultiChannel: true,
    url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/Sintel.mp4',
    thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=800&q=80',
  },
];
