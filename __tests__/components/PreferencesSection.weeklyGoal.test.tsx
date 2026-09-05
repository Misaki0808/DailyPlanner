import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import PreferencesSection from '../../src/components/settings/PreferencesSection';
import { defaultSettings } from '../../src/utils/defaultSettings';
import { Settings } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../src/utils/notificationService', () => ({
  scheduleDailySummaryNotification: jest.fn().mockResolvedValue('id'),
  cancelAllNotifications: jest.fn().mockResolvedValue(undefined),
  requestNotificationPermissions: jest.fn().mockResolvedValue(true),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

/**
 * R-033: haftalık hedef özelliği varsayılan KAPALI gelmeli, ama Ayarlar'dan
 * görülebilir ve açılabilir olmalı.
 */
describe('PreferencesSection — haftalık görev hedefi', () => {
  const renderWith = (settings: Settings) => {
    const onUpdateSettings = jest.fn().mockResolvedValue(undefined);
    const utils = render(
      <PreferencesSection settings={settings} onUpdateSettings={onUpdateSettings} />
    );
    return { ...utils, onUpdateSettings };
  };

  it('varsayılan ayarlarda kapalı görünür', () => {
    const { getByText } = renderWith(defaultSettings);

    expect(getByText('Haftalık görev hedefi')).toBeTruthy();
    expect(getByText('Kapalı. Hedef rozeti gösterilmez.')).toBeTruthy();
  });

  it('kapalıyken bile ayar görünür ve artırılabilir', () => {
    const { getByLabelText, onUpdateSettings } = renderWith(defaultSettings);

    fireEvent.press(getByLabelText('Haftalık hedefi artır'));

    expect(onUpdateSettings).toHaveBeenCalledWith({ weeklyTaskGoal: 5 });
  });

  it('hedef seçiliyken kaç görev hedeflendiğini gösterir', () => {
    const { getByText } = renderWith({ ...defaultSettings, weeklyTaskGoal: 20 });

    expect(getByText(/Bu hafta 20 görev tamamlamayı hedefliyorsun/)).toBeTruthy();
  });

  it('hedef 0 iken daha da azaltılamaz', () => {
    const { getByLabelText, onUpdateSettings } = renderWith(defaultSettings);

    fireEvent.press(getByLabelText('Haftalık hedefi azalt'));

    expect(onUpdateSettings).not.toHaveBeenCalled();
  });

  it('hedef 5 iken azaltmak özelliği kapatır', () => {
    const { getByLabelText, onUpdateSettings } = renderWith({ ...defaultSettings, weeklyTaskGoal: 5 });

    fireEvent.press(getByLabelText('Haftalık hedefi azalt'));

    expect(onUpdateSettings).toHaveBeenCalledWith({ weeklyTaskGoal: 0 });
  });
});
