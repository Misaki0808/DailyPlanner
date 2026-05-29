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
  });
});
