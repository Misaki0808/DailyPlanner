import React from 'react';
import { render } from '@testing-library/react-native';
import CategoryDonutChart from '../../src/components/charts/CategoryDonutChart';
import { getCategoryColor } from '../../src/utils/categories';
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

// Halka grafiğin kendisi yerine ona verilen veriyi doğrulamak için
// gifted-charts sahteleniyor; kütüphanenin çizimi test kapsamı dışında.
const pieProps: any[] = [];
jest.mock('react-native-gifted-charts', () => ({
  PieChart: (props: any) => {
    pieProps.push(props);
    return null;
  },
}));

const task = (id: string, category?: string): Task => ({ id, title: `Görev ${id}`, done: false, category });

describe('CategoryDonutChart', () => {
  beforeEach(() => {
    pieProps.length = 0;
  });

  it('hiç görev yoksa hiçbir şey çizmez', () => {
    const { toJSON } = render(<CategoryDonutChart plans={{}} />);
    expect(toJSON()).toBeNull();
  });

  it('kategorileri sayar ve yüzdeye çevirir', () => {
    const plans: Plans = {
      '2026-09-05': [task('1', 'is'), task('2', 'is'), task('3', 'spor')],
      '2026-09-06': [task('4', 'is')],
    };

    render(<CategoryDonutChart plans={plans} />);

    const data = pieProps[0].data;
    expect(data).toHaveLength(2);
    expect(data.find((d: any) => d.category === 'is')).toMatchObject({ value: 3, text: '75%' });
    expect(data.find((d: any) => d.category === 'spor')).toMatchObject({ value: 1, text: '25%' });
  });

  it('kategorisi olmayan görevi "diger" sayar', () => {
    const plans: Plans = { '2026-09-05': [task('1')] };

    render(<CategoryDonutChart plans={plans} />);

    expect(pieProps[0].data[0]).toMatchObject({ category: 'diger', value: 1 });
  });

  // Önceden renkler sıraya göre dört renkten döngüsel atanıyordu; aynı
  // kategori farklı ekranlarda farklı renkte görünebiliyordu.
  it('her kategoriye kendi tanımlı rengini verir', () => {
    const plans: Plans = { '2026-09-05': [task('1', 'spor'), task('2', 'saglik')] };

    render(<CategoryDonutChart plans={plans} />);

    const data = pieProps[0].data;
    expect(data.find((d: any) => d.category === 'spor').color).toBe(getCategoryColor('spor'));
    expect(data.find((d: any) => d.category === 'saglik').color).toBe(getCategoryColor('saglik'));
  });

  it('eksik gün listelerinde çökmez', () => {
    const plans = { '2026-09-05': undefined } as unknown as Plans;
    expect(() => render(<CategoryDonutChart plans={plans} />)).not.toThrow();
  });
});
