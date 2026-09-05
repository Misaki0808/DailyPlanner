import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  saveUserName, 
  getUserName, 
  savePlan, 
  getPlanByDate, 
  getAllPlans, 
  deletePlan 
} from '../../src/utils/storage';
import { Task } from '../../src/types';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

describe('storage utility', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('User Info', () => {
    it('should save and get user name', async () => {
      const result = await saveUserName('Test User');
      expect(result).toBe(true);

      const name = await getUserName();
      expect(name).toBe('Test User');
    });

    it('should return null if user name is not set', async () => {
      const name = await getUserName();
      expect(name).toBeNull();
    });
  });

  describe('Plans', () => {
    const mockDate = '2025-05-30';
    const mockTasks: Task[] = [
      { id: '1', title: 'Task 1', done: false, priority: 'high', category: 'is' },
      { id: '2', title: 'Task 2', done: true, priority: 'low', category: 'kisisel' },
    ];

    it('should save a plan successfully', async () => {
      const result = await savePlan(mockDate, mockTasks);
      expect(result).toBe(true);

      const savedData = await AsyncStorage.getItem(`@dp_plan_${mockDate}`);
      expect(JSON.parse(savedData || '[]')).toEqual(mockTasks);
    });

    it('should retrieve a plan by date', async () => {
      await savePlan(mockDate, mockTasks);
      const retrievedTasks = await getPlanByDate(mockDate);
      expect(retrievedTasks).toEqual(mockTasks);
    });

    it('should return empty array for non-existent plan date', async () => {
      const retrievedTasks = await getPlanByDate('2020-01-01');
      expect(retrievedTasks).toEqual([]);
    });

    it('should delete a plan by date', async () => {
      await savePlan(mockDate, mockTasks);
      let tasks = await getPlanByDate(mockDate);
      expect(tasks).toHaveLength(2);

      const deleteResult = await deletePlan(mockDate);
      expect(deleteResult).toBe(true);

      tasks = await getPlanByDate(mockDate);
      expect(tasks).toEqual([]);
    });

    it('should get all plans', async () => {
      await savePlan(mockDate, mockTasks);
      await savePlan('2025-05-31', [mockTasks[0]]);

      const allPlans = await getAllPlans();
      expect(Object.keys(allPlans)).toHaveLength(2);
      expect(allPlans[mockDate]).toEqual(mockTasks);
      expect(allPlans['2025-05-31']).toEqual([mockTasks[0]]);
    });

    // Regresyon (R-007): JSON.parse döngü içindeydi ama try/catch dıştaydı.
    // Tek bir bozuk gün tüm fonksiyonun {} döndürmesine yol açıyor, kullanıcı
    // sağlam planlarını da göremiyordu.
    it('bozuk tek bir kayıt diğer planları düşürmez', async () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      try {
        await savePlan(mockDate, mockTasks);
        await savePlan('2025-05-31', [mockTasks[0]]);
        await AsyncStorage.setItem('@dp_plan_2025-06-01', '{bozuk-json');

        const allPlans = await getAllPlans();

        expect(allPlans[mockDate]).toEqual(mockTasks);
        expect(allPlans['2025-05-31']).toEqual([mockTasks[0]]);
        expect(allPlans['2025-06-01']).toBeUndefined();
        expect(errorSpy).toHaveBeenCalled();
      } finally {
        errorSpy.mockRestore();
      }
    });

    it('dizi olmayan bir kaydı boş listeye çevirir', async () => {
      await AsyncStorage.setItem('@dp_plan_2025-06-02', '{"gorevler":[]}');
      const allPlans = await getAllPlans();
      expect(allPlans['2025-06-02']).toEqual([]);
    });
  });
});
