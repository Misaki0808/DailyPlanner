import { useState } from 'react';
import { Gender } from '../types';
import * as storage from '../utils/storage';

export const useUser = () => {
  const [username, setUsernameState] = useState<string | null>(null);
  const [gender, setGenderState] = useState<Gender>('male');

  const setUsername = async (name: string) => {
    try {
      await storage.saveUserName(name);
      setUsernameState(name);
    } catch (error) {
      console.error('Kullanıcı adı kaydetme hatası:', error);
      throw error;
    }
  };

  const setGender = async (newGender: Gender) => {
    try {
      await storage.saveGender(newGender);
      setGenderState(newGender);
    } catch (error) {
      console.error('Gender kaydetme hatası:', error);
      throw error;
    }
  };

  return { username, setUsernameState, setUsername, gender, setGenderState, setGender };
};
