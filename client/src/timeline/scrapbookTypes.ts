import type { UserId } from './types';
export type { UserId };

export type ScrapbookElementType = 'photo' | 'letter' | 'text' | 'sticker' | 'voice' | 'link';

export interface BaseElement {
  id: string;
  type: ScrapbookElementType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  opacity: number;
  lock?: boolean;
  createdBy: UserId;
  updatedBy: UserId;
  sourceMemoryId?: string; // Tautan ke ID Momen di Linimasa (jika diimpor)
}

export type FrameStyle = 'polaroid' | 'scalloped' | 'soft' | 'clean';

export interface PhotoElement extends BaseElement {
  type: 'photo';
  photos: string[]; // blob ID atau direct image dataURL/URL
  frame: FrameStyle;
  caption?: string;
  date?: string;
}

export interface LetterElement extends BaseElement {
  type: 'letter';
  title?: string;
  label?: string;
  from?: string;
  to?: string;
  date?: string;
  body?: string;
  theme?: string;
}

export interface TextElement extends BaseElement {
  type: 'text';
  text: string;
  font: 'hand' | 'script' | 'serif' | 'sans';
  size: number;
  color: string;
  align: 'left' | 'center' | 'right';
  weight: '400' | '700';
}

export interface StickerElement extends BaseElement {
  type: 'sticker';
  kind: 'builtin' | 'asset';
  name?: string;
  assetId?: string;
  color?: string;
}

export interface VoiceElement extends BaseElement {
  type: 'voice';
  title: string;
  duration: number;
  audioUrl?: string;
  audioBlobId?: string;
  theme?: string;
}

export interface LinkElement extends BaseElement {
  type: 'link';
  title: string;
  subtitle?: string;
  url: string;
  thumbBlobId?: string;
  theme?: string;
}

export type ScrapbookElement =
  | PhotoElement
  | LetterElement
  | TextElement
  | StickerElement
  | VoiceElement
  | LinkElement;

export type BackgroundPattern = 'none' | 'polka' | 'grid' | 'paper' | 'lined';
export type PageBorderFrame = 'none' | 'lace' | 'stitch';

export interface PageBackground {
  type: 'solid' | 'gradient' | 'image';
  color: string;
  color2?: string;
  gradient?: 'diagonal' | 'vertical' | 'radial';
  pattern: BackgroundPattern;
  patternColor: string;
  frame: PageBorderFrame;
  frameColor: string;
  imageId?: string;
  imageDim: number;
}

export interface ScrapbookPage {
  id: string;
  author: UserId;
  updatedBy: UserId;
  background: PageBackground;
  elements: ScrapbookElement[];
}

export interface ScrapbookAsset {
  id: string;
  name: string;
  blobId: string;
  ar: number; // aspect ratio w/h
}

export interface ScrapbookMeta {
  title: string;
  subtitle: string;
  coverColor: string;
  accent: string;
  sceneColor: string;
  coverImageBlobId?: string; // opsional: foto background sampul depan
}

export interface ScrapbookState {
  meta: ScrapbookMeta;
  pages: ScrapbookPage[];
  assets: ScrapbookAsset[];
  blobs: Record<string, string>;
  ui: {
    turned: number;
    mode3d: boolean;
    user: UserId;
  };
}
