import { create } from 'zustand';
import { Gender } from '../types';
import * as storage from '../utils/storage';
import { persistOrNotify } from '../utils/persistence';

interface UserState {
  username: string | null;
  gender: Gender;
  aboutMe: string;
  setUsername: (name: string) => Promise<void>;
  setGender: (gender: Gender) => Promise<void>;
  saveAboutMe: (text: string) => Promise<void>;
  _hydrate: (data: { username: string | null; gender: Gender; aboutMe: string }) => void;
}

export const useUserStore = create<UserState>((set) => ({
  username: null,
  gender: 'male',
  aboutMe: '',
  setUsername: async (name: string) => {
    set({ username: name });
    await persistOrNotify('Kullanıcı adı', storage.saveUserName(name));
  },
  setGender: async (gender: Gender) => {
    set({ gender });
    await persistOrNotify('Profil', storage.saveGender(gender));
  },
  saveAboutMe: async (text: string) => {
    set({ aboutMe: text });
    await persistOrNotify('Hakkımda', storage.saveAboutMe(text));
  },
  _hydrate: (data) => set(data),
}));
