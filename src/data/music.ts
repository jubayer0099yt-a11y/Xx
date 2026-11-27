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
    id: 'nithua-pathare',
    title: 'Nithua Pathare (Lo-Fi)',
    titleBn: 'নিথুয়া পাথারে (লো-ফাই)',
    artist: 'AR Music',
    src: '/assets/aistudio/ar.music96_2026-11-27-08-19-09_1795745949563_d8e5e699.mp4',
    durationSec: 180,
  },
  {
    id: 'tu-pyar-mein-foyej',
    title: 'Tu Pyar Mein (Acoustic)',
    titleBn: 'তু পিয়ার মে (অ্যাকোস্টিক)',
    artist: 'Foyej Music',
    src: '/assets/aistudio/foyej_music_2026-11-27-08-17-58_1795745878607_35554426.mp4',
    durationSec: 143,
  },
  {
    id: 'aashiq-dil-tera',
    title: 'Aashiq Dil Tera Purana',
    titleBn: 'আশিক দিল তেরা পুরানা',
    artist: 'Tititunes',
    src: '/assets/aistudio/tititunes_2026-11-27-08-18-19_1795745899533_dd6399ca.mp4',
    durationSec: 43,
  },
  {
    id: 'badal-awara-shanto',
    title: 'Badal Awara (Cover)',
    titleBn: 'বাদল আওয়ারা (কভার)',
    artist: 'BSOP Shanto',
    src: '/assets/aistudio/bsop_cover_shanto2.2_2026-11-27-08-18-55_1795745935545_8baf5b63.mp4',
    durationSec: 39,
  },
];
