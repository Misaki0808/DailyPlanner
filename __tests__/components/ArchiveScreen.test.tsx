import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import ArchiveScreen from '../../src/screens/ArchiveScreen';
import { usePlansStore } from '../../src/store/plansStore';
import { Plans, Task } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('../../src/utils/notificationService', () => ({
  requestNotificationPermissions: jest.fn(),
  scheduleDailySummaryNotification: jest.fn(),
}));

jest.mock('../../src/hooks/useCloudSync', () => ({
  backupToCloudSilently: jest.fn(),
  fetchCloudBackupRecord: jest.fn(),
}));

jest.mock('react-native-toast-message', () => ({ show: jest.fn() }));

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
}));

const task = (id: string, title: string, done = false): Task => ({ id, title, done });

const setPlans = (plans: Plans) => usePlansStore.setState({ plans });

describe('ArchiveScreen', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    setPlans({});
    // Bugün sabit: arşiv yalnız GEÇMİŞ günleri gösterir
    jest.useFakeTimers().setSystemTime(new Date(2026, 8, 10, 12, 0, 0)); // 10 Eylül 2026
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('geçmiş yokken boş durum gösterir', () => {
    const { getByText } = render(<ArchiveScreen />);

    expect(getByText('Geçmiş henüz boş')).toBeTruthy();
  });

  it('bugün ve ileri tarih varken de boş durum gösterir', () => {
    setPlans({ '2026-09-10': [task('1', 'Bugün')], '2026-09-15': [task('2', 'İleri')] });

    const { getByText } = render(<ArchiveScreen />);

    expect(getByText('Geçmiş henüz boş')).toBeTruthy();
  });

  it('ay başlığı ve gün satırını çizer', () => {
    setPlans({ '2026-09-08': [task('1', 'Spor yap', true), task('2', 'Rapor yaz')] });

    const { getByText } = render(<ArchiveScreen />);

    // Ay başlığı tam metin; gün etiketi ("8 Eylül 2026 Salı") ayrı düğüm.
    expect(getByText('Eylül 2026')).toBeTruthy();
    expect(getByText(/8 Eylül 2026/)).toBeTruthy();
    expect(getByText('1/2')).toBeTruthy();
  });

  it('arşiv özetini gösterir', () => {
    setPlans({
      '2026-09-08': [task('1', 'A', true)],
      '2026-08-20': [task('2', 'B')],
    });

    const { getByText } = render(<ArchiveScreen />);

    expect(getByText(/2 gün · 2 ay · 1\/2 görev/)).toBeTruthy();
  });

  it('gün kapalıyken görev listesini göstermez', () => {
    setPlans({ '2026-09-08': [task('1', 'Gizli görev')] });

    const { queryByText } = render(<ArchiveScreen />);

    expect(queryByText(/Gizli görev/)).toBeNull();
  });

  it('güne dokununca görev listesini yerinde açar', () => {
    setPlans({ '2026-09-08': [task('1', 'Spor yap', true), task('2', 'Rapor yaz')] });

    const { getByLabelText, getByText } = render(<ArchiveScreen />);
    fireEvent.press(getByLabelText(/8 Eylül 2026.*1 \/ 2 görev tamamlandı/));

    expect(getByText(/Spor yap/)).toBeTruthy();
    expect(getByText(/Rapor yaz/)).toBeTruthy();
  });

  it('açılan günden Planlarım ekranına o tarihle atlar', () => {
    setPlans({ '2026-09-08': [task('1', 'Spor yap')] });

    const { getByLabelText } = render(<ArchiveScreen />);
    fireEvent.press(getByLabelText(/8 Eylül 2026/));
    fireEvent.press(getByLabelText(/Planlarım ekranında aç/));

    expect(mockNavigate).toHaveBeenCalledWith('MultiDayView', { date: '2026-09-08' });
  });

  it('ikinci dokunuşta listeyi kapatır', () => {
    setPlans({ '2026-09-08': [task('1', 'Spor yap')] });

    const { getByLabelText, queryByText } = render(<ArchiveScreen />);
    const row = getByLabelText(/8 Eylül 2026/);

    fireEvent.press(row);
    expect(queryByText(/Spor yap/)).not.toBeNull();

    fireEvent.press(row);
    expect(queryByText(/Spor yap/)).toBeNull();
  });

  it('gün satırına ekran okuyucu özeti verir', () => {
    setPlans({ '2026-09-08': [task('1', 'A', true), task('2', 'B', true)] });

    const { getByLabelText } = render(<ArchiveScreen />);

    expect(getByLabelText(/2 \/ 2 görev tamamlandı, yüzde 100/)).toBeTruthy();
  });
});
