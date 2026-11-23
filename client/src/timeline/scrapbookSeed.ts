import type { ScrapbookState, ScrapbookPage, ScrapbookElement } from './scrapbookTypes';
import { seededRandom, drawBuiltinSticker } from './scrapbookRenderer';

function makeSamplePhoto(kind: string): string {
  const c = document.createElement('canvas');
  c.width = 640;
  c.height = 480;
  const x = c.getContext('2d')!;
  const R = seededRandom('ph-' + kind);

  const sky = (a: string, b: string, d: string) => {
    const g = x.createLinearGradient(0, 0, 0, 480);
    g.addColorStop(0, a);
    g.addColorStop(0.6, b);
    g.addColorStop(1, d);
    x.fillStyle = g;
    x.fillRect(0, 0, 640, 480);
  };

  const sun = (cx: number, cy: number, r: number, col: string) => {
    const g = x.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.5);
    g.addColorStop(0, col);
    g.addColorStop(0.4, col + 'aa');
    g.addColorStop(1, col + '00');
    x.fillStyle = g;
    x.beginPath();
    x.arc(cx, cy, r * 2.5, 0, 7);
    x.fill();
    x.fillStyle = '#fff6d8';
    x.beginPath();
    x.arc(cx, cy, r, 0, 7);
    x.fill();
  };

  if (kind === 'sunset') {
    sky('#5b4b9a', '#f58ba5', '#ffc08a');
    sun(320, 290, 40, '#ffd27a');
    const g = x.createLinearGradient(0, 300, 0, 480);
    g.addColorStop(0, '#f6a56f');
    g.addColorStop(1, '#4b3f86');
    x.fillStyle = g;
    x.fillRect(0, 300, 640, 180);
  } else if (kind === 'mountain') {
    sky('#8cc8f2', '#cfe9ff', '#eaf6ff');
    x.fillStyle = '#5f8c7a';
    x.beginPath();
    x.moveTo(0, 480);
    x.lineTo(180, 260);
    x.lineTo(360, 480);
    x.fill();
    x.fillStyle = '#3f6b4f';
    x.beginPath();
    x.moveTo(280, 480);
    x.lineTo(460, 280);
    x.lineTo(640, 480);
    x.fill();
  } else {
    sky('#7fd1f5', '#cdeeff', '#fff3d6');
    sun(480, 100, 30, '#ffe08a');
    x.fillStyle = '#3fbfd6';
    x.fillRect(0, 260, 640, 100);
    x.fillStyle = '#f3dfae';
    x.fillRect(0, 360, 640, 120);
  }
  return c.toDataURL('image/jpeg', 0.82);
}

export function createSeedScrapbook(): ScrapbookState {
  const blobs: Record<string, string> = {
    bl_sunset: makeSamplePhoto('sunset'),
    bl_mountain: makeSamplePhoto('mountain'),
    bl_beach: makeSamplePhoto('beach'),
  };

  const pages: ScrapbookPage[] = [
    {
      id: 'pg_1',
      author: 'A',
      updatedBy: 'A',
      background: {
        type: 'solid',
        color: '#fbf1e1',
        pattern: 'paper',
        patternColor: '#d9c3a5',
        frame: 'lace',
        frameColor: '#ffffff',
        imageDim: 0,
      },
      elements: [
        {
          id: 'el_1_title',
          type: 'text',
          text: 'Little Pieces of Us',
          font: 'script',
          size: 46,
          color: '#c9677a',
          align: 'center',
          weight: '700',
          x: 300,
          y: 110,
          w: 500,
          h: 80,
          rotation: -2,
          opacity: 1,
          createdBy: 'A',
          updatedBy: 'A',
        },
        {
          id: 'el_1_photo',
          type: 'photo',
          photos: ['bl_sunset'],
          frame: 'polaroid',
          caption: 'Senja pertama kita',
          date: '12 Juli 2024',
          x: 300,
          y: 380,
          w: 310,
          h: 360,
          rotation: -3,
          opacity: 1,
          lock: true,
          createdBy: 'A',
          updatedBy: 'A',
        },
        {
          id: 'el_1_washi',
          type: 'sticker',
          kind: 'builtin',
          name: 'washi',
          color: '#f4a6b8',
          x: 300,
          y: 205,
          w: 190,
          h: 50,
          rotation: -6,
          opacity: 0.9,
          lock: false,
          createdBy: 'A',
          updatedBy: 'A',
        },
        {
          id: 'el_1_heart',
          type: 'sticker',
          kind: 'builtin',
          name: 'heart',
          color: '#ff6b8b',
          x: 480,
          y: 540,
          w: 70,
          h: 70,
          rotation: 12,
          opacity: 1,
          lock: true,
          createdBy: 'A',
          updatedBy: 'A',
        },
      ],
    },
    {
      id: 'pg_2',
      author: 'A',
      updatedBy: 'A',
      background: {
        type: 'gradient',
        color: '#efe7ff',
        color2: '#ffe9f1',
        gradient: 'diagonal',
        pattern: 'polka',
        patternColor: '#d7c6f5',
        frame: 'stitch',
        frameColor: '#ffffff',
        imageDim: 0,
      },
      elements: [
        {
          id: 'el_2_title',
          type: 'text',
          text: "Summer Journey '24",
          font: 'hand',
          size: 52,
          color: '#7a5bb0',
          align: 'center',
          weight: '700',
          x: 300,
          y: 95,
          w: 420,
          h: 80,
          rotation: -1,
          opacity: 1,
          createdBy: 'A',
          updatedBy: 'A',
        },
        {
          id: 'el_2_photo',
          type: 'photo',
          photos: ['bl_mountain'],
          frame: 'scalloped',
          caption: 'Puncak yang kita capai',
          date: '3 Agustus 2024',
          x: 300,
          y: 330,
          w: 320,
          h: 290,
          rotation: 3,
          opacity: 1,
          lock: true,
          createdBy: 'A',
          updatedBy: 'A',
        },
        {
          id: 'el_2_voice',
          type: 'voice',
          title: 'Tawa kamu pas hujan',
          duration: 12,
          theme: 'lilac',
          x: 300,
          y: 560,
          w: 360,
          h: 70,
          rotation: -2,
          opacity: 1,
          createdBy: 'A',
          updatedBy: 'A',
        },
        {
          id: 'el_2_sparkle',
          type: 'sticker',
          kind: 'builtin',
          name: 'sparkle',
          color: '#ffbe53',
          x: 480,
          y: 160,
          w: 70,
          h: 70,
          rotation: 12,
          opacity: 1,
          lock: true,
          createdBy: 'A',
          updatedBy: 'A',
        },
      ],
    },
    {
      id: 'pg_3',
      author: 'B',
      updatedBy: 'B',
      background: {
        type: 'solid',
        color: '#ffe4ea',
        pattern: 'polka',
        patternColor: '#f6b3c2',
        frame: 'none',
        frameColor: '#ffffff',
        imageDim: 0,
      },
      elements: [
        {
          id: 'el_3_letter',
          type: 'letter',
          title: 'Tentang Kita',
          label: 'A little note for you',
          from: 'User B',
          to: 'User A',
          date: '14 Februari 2025',
          body: 'Hai kamu,\n\nTerima kasih selalu ada dan jadi tempat pulang paling nyaman. Semoga buku ini terus bertambah halamannya seiring waktu.',
          theme: 'rose',
          x: 300,
          y: 280,
          w: 380,
          h: 270,
          rotation: -2,
          opacity: 1,
          createdBy: 'B',
          updatedBy: 'B',
        },
        {
          id: 'el_3_link',
          type: 'link',
          title: 'Lagu Favorit Berdua',
          subtitle: 'Diputar berulang-ulang waktu nyetir malam',
          url: 'https://open.spotify.com/',
          theme: 'mint',
          x: 300,
          y: 560,
          w: 380,
          h: 124,
          rotation: 1.5,
          opacity: 1,
          createdBy: 'B',
          updatedBy: 'B',
        },
      ],
    },
    {
      id: 'pg_4',
      author: 'A',
      updatedBy: 'A',
      background: {
        type: 'solid',
        color: '#eaf8ef',
        pattern: 'grid',
        patternColor: '#bfe3cc',
        frame: 'none',
        frameColor: '#ffffff',
        imageDim: 0,
      },
      elements: [
        {
          id: 'el_4_photo',
          type: 'photo',
          photos: ['bl_beach'],
          frame: 'clean',
          caption: 'Tepi laut dan angin sore',
          date: '20 Sep 2024',
          x: 300,
          y: 310,
          w: 370,
          h: 310,
          rotation: -2,
          opacity: 1,
          lock: true,
          createdBy: 'A',
          updatedBy: 'A',
        },
        {
          id: 'el_4_txt',
          type: 'text',
          text: 'Hari-hari biasa yang jadi luar biasa karena kita lewati berdua.',
          font: 'hand',
          size: 32,
          color: '#305a40',
          align: 'center',
          weight: '700',
          x: 300,
          y: 570,
          w: 440,
          h: 90,
          rotation: 1,
          opacity: 1,
          createdBy: 'A',
          updatedBy: 'A',
        },
      ],
    },
  ];

  return {
    meta: {
      title: 'Our Little Scrapbook',
      subtitle: 'kumpulan momen kecil kita',
      coverColor: '#c9677a',
      accent: '#f6d58e',
      sceneColor: '#e6d6bf',
    },
    pages,
    assets: [],
    blobs,
    ui: {
      turned: 0,
      mode3d: true,
      user: 'A',
    },
  };
}
