export type UserId = 'A' | 'B';
export type Category = 'call' | 'movie' | 'games' | 'milestone' | 'food' | 'other';
export type Visibility = 'private' | 'shared';

export interface Memory {
  id: string;
  eventDate: string;      // YYYY-MM-DD, tanggal momen benar-benar terjadi
  title: string;
  description: string;
  category: Category;
  images: string[];       // data URL (sudah dikompres) atau URL dari storage asli
  visibility: Visibility; // private = hanya pembuat, shared = kedua orang
  createdBy: UserId;
  createdAt: number;
  updatedAt: number;
}
// Input dari form (field yang diisi pengguna)
export type MemoryInput = Pick<Memory, 'eventDate' | 'title' | 'description' | 'category' | 'images' | 'visibility'>;

export interface UserInfo { name: string; color: string }
export type UsersConfig = Record<UserId, UserInfo>;
