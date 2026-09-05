import React from 'react';
import { render } from '@testing-library/react-native';
import WeeklyChart from '../../src/components/charts/WeeklyChart';
import { getToday, addDays } from '../../src/utils/dateUtils';
import { Plans, Task } from '../../src/types';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// useTheme -> AppContext -> appStore -> notificationService zinciri testte
// expo-notifications'ı yüklüyor; gereksiz uyarıyı önlemek için mock'lanıyor.
jest.mock('../../src/utils/notificationService', () => ({
  requestNotificationPermissions: jest.fn(),
  scheduleDailySummaryNotification: jest.fn(),
}));

jest.mock('../../src/hooks/useCloudSync', () => ({
  backupToCloudSilently: jest.fn(),
  fetchCloudBackupRecord: jest.fn(),
}));

const task = (id: string, done: boolean): Task => ({ id, title: `Görev ${id}`, done });

/** Belirtilen günde `done` tamamlanmış, `open` açık görev üretir. */
const day = (done: number, open = 0): Task[] => [
  ...Array.from({ length: done }, (_, i) => task(`d${i}`, true)),
  ...Array.from({ length: open }, (_, i) => task(`o${i}`, false)),
];

describe('WeeklyChart', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('son 7 gün için birer çubuk çizer', () => {
    const { getAllByText } = render(<WeeklyChart plans={{}} />);
    // Veri yokken boş durum gösterilir, çubuk çizilmez
    expect(getAllByText('Son 7 günde kayıtlı görev yok.')).toHaveLength(1);
  });

  it('haftalık toplamı başlıkta özetler', () => {
    const plans: Plans = {
      [getToday()]: day(2, 1),
      [addDays(getToday(), -2)]: day(1, 1),
    };

    const { getByText } = render(<WeeklyChart plans={plans} />);

    expect(getByText('📊 Haftalık Performans')).toBeTruthy();
    expect(getByText('3/5 görev')).toBeTruthy();
  });

  it('her gün için tamamlanan/toplam etiketini gösterir', () => {
    const plans: Plans = { [getToday()]: day(2, 3) };

    const { getByText, getAllByText } = render(<WeeklyChart plans={plans} />);

    expect(getByText('2/5')).toBeTruthy();
    // Görev olmayan diğer 6 gün
    expect(getAllByText('0/0')).toHaveLength(6);
  });

  it('hafta dışındaki günleri saymaz', () => {
    const plans: Plans = {
      [getToday()]: day(1),
      [addDays(getToday(), -7)]: day(9), // 7 günlük pencerenin dışında
    };

    const { getByText } = render(<WeeklyChart plans={plans} />);

    expect(getByText('1/1 görev')).toBeTruthy();
  });

  it('her çubuğa ekran okuyucu etiketi verir', () => {
    const plans: Plans = { [getToday()]: day(2, 1) };

    const { getByLabelText } = render(<WeeklyChart plans={plans} />);

    // Bugünün çubuğu; gün adı yerel biçimden geldiği için regex ile aranıyor
    expect(getByLabelText(/2 \/ 3 görev tamamlandı/)).toBeTruthy();
  });

  it('boş haftada çökmez ve boş durum metni gösterir', () => {
    const { getByText, queryByText } = render(<WeeklyChart plans={{}} />);

    expect(getByText('Son 7 gün')).toBeTruthy();
    expect(getByText('Son 7 günde kayıtlı görev yok.')).toBeTruthy();
    expect(queryByText('0/0')).toBeNull();
  });

  it('bozuk/eksik gün listelerinde çökmez', () => {
    const plans = { [getToday()]: undefined } as unknown as Plans;

    expect(() => render(<WeeklyChart plans={plans} />)).not.toThrow();
  });

  // Regresyon (DP-001 / W-08): günler UTC ile anahtarlanırsa çubuklar komşu
  // günün verisini gösterir. jest.setup.js TZ'yi Europe/Istanbul'a sabitler;
  // UTC 21:30'da yerel gün çoktan ertesi güne geçmiştir.
  it('gece yarısından sonra YEREL günün verisini gösterir', () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-09-09T21:30:00Z')); // Istanbul: 10.09 00:30

    expect(new Date().toISOString().split('T')[0]).toBe('2026-09-09'); // UTC hâlâ 9'u
    expect(getToday()).toBe('2026-09-10');

    const plans: Plans = {
      '2026-09-09': day(5), // UTC gününe yazılmış veri
      '2026-09-10': day(1, 1), // gerçek yerel bugün
    };

    const { getByText } = render(<WeeklyChart plans={plans} />);

    // Bugünün çubuğu 1/2 olmalı; UTC anahtarlansaydı 5/5 görünürdü
    expect(getByText('1/2')).toBeTruthy();
    expect(getByText('5/5')).toBeTruthy(); // dünkü çubuk
    expect(getByText('6/7 görev')).toBeTruthy();
  });

  it('ay sınırında doğru günleri kapsar', () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 2, 2, 12, 0, 0)); // 2 Mart 2026

    const plans: Plans = {
      '2026-02-24': day(3), // 6 gün önce, pencerede
      '2026-02-23': day(9), // 7 gün önce, pencere DIŞI
      '2026-03-02': day(1),
    };

    const { getByText } = render(<WeeklyChart plans={plans} />);

    expect(getByText('4/4 görev')).toBeTruthy();
  });
});
