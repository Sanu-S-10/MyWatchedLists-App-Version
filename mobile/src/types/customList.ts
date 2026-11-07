import { MediaType, SubType } from './media';

export interface CustomListItem {
  watchItem: string;
  tmdbId: number;
  mediaType: MediaType;
  subType?: SubType;
  title: string;
  posterPath?: string;
  releaseDate?: string;
}

export interface CustomList {
  _id: string;
  name: string;
  description?: string;
  isPublic: boolean;
  shareId: string;
  itemCount: number;
  items: CustomListItem[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomListPayload {
  name: string;
  description?: string;
  itemIds: string[];
  isPublic?: boolean;
}

export interface SharedCustomList {
  name: string;
  description?: string;
  itemCount: number;
  items: {
    tmdbId: number;
    mediaType: MediaType;
    subType?: SubType;
    title: string;
    posterPath?: string;
    releaseDate?: string;
  }[];
}
