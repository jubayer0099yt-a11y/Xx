export interface MusicTrack {
  id: string;
  title: string;
  titleBn: string;
  artist: string;
  src: string;
  durationSec: number;
}

export const MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'song-1',
    title: 'Song 1',
    titleBn: 'Song 1',
    artist: '',
    src: '/assets/aistudio/ar.music96_2026-11-27-08-19-09_1795745949563_d8e5e699.mp4',
    durationSec: 180,
  },
  {
    id: 'song-2',
    title: 'Song 2',
    titleBn: 'Song 2',
    artist: '',
    src: '/assets/aistudio/foyej_music_2026-11-27-08-17-58_1795745878607_35554426.mp4',
    durationSec: 143,
  },
  {
    id: 'song-3',
    title: 'Song 3',
    titleBn: 'Song 3',
    artist: '',
    src: '/assets/aistudio/tititunes_2026-11-27-08-18-19_1795745899533_dd6399ca.mp4',
    durationSec: 43,
  },
  {
    id: 'song-4',
    title: 'Song 4',
    titleBn: 'Song 4',
    artist: '',
    src: '/assets/aistudio/bsop_cover_shanto2.2_2026-11-27-08-18-55_1795745935545_8baf5b63.mp4',
    durationSec: 39,
  },
];
