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

  // Regresyon (R-036): tanınmayan kimlik ayrı bir dilim oluşturuyordu;
  // İstatistikler listesi ise o satırı hiç göstermiyordu. İki ekran da artık
  // aynı "Diğer" grubunu kullanıyor.
  it('tanınmayan kategoriyi "diger" ile BİRLEŞTİRİR', () => {
    const plans: Plans = {
      '2026-09-05': [task('1', 'bilinmeyen'), task('2', 'diger'), task('3', 'spor')],
    };

    render(<CategoryDonutChart plans={plans} />);

    const data = pieProps[0].data;
    expect(data).toHaveLength(2);
    expect(data.find((d: any) => d.category === 'diger')).toMatchObject({ value: 2 });
    expect(data.find((d: any) => d.category === 'bilinmeyen')).toBeUndefined();
  });

  // R-037 + R-038: SVG dilimlerinin ekran okuyucuda metin karşılığı yok.
  // Dilim detayları önce sıfır yükseklikli kırpılmış bir katmandaydı; ekran
  // okuyucular böyle düğümleri atlayabildiği için artık hepsi grafiğin TEK
  // birleşik accessibilityLabel'ında.
  describe('erişilebilirlik', () => {
    it('özeti ve tüm dilimleri tek bir etikette birleştirir', () => {
      const plans: Plans = {
        '2026-09-05': [task('1', 'is'), task('2', 'is'), task('3', 'spor'), task('4', 'spor')],
      };

      const { getByLabelText } = render(<CategoryDonutChart plans={plans} />);

      expect(
        getByLabelText(
          'Kategori dağılımı halka grafiği. Toplam 4 görev, 2 kategori. ' +
          'İş: 2 görev, yüzde 50. Spor: 2 görev, yüzde 50.'
        )
      ).toBeTruthy();
    });

    it('birleştirilen dilim "Diğer" adıyla etiketlenir', () => {
      const plans: Plans = { '2026-09-05': [task('1', 'bilinmeyen')] };

      const { getByLabelText } = render(<CategoryDonutChart plans={plans} />);

      expect(getByLabelText(/Diğer: 1 görev, yüzde 100\./)).toBeTruthy();
    });

    // Grafiğin iç düğümleri okuyucudan gizleniyor ki tek düğüm olarak okunsun.
    it('grafik alt ağacını erişilebilirlikten gizler', () => {
      const plans: Plans = { '2026-09-05': [task('1', 'is')] };

      const { getByLabelText } = render(<CategoryDonutChart plans={plans} />);
      const chart = getByLabelText(/Kategori dağılımı halka grafiği/);

      expect(chart.props.accessible).toBe(true);
      expect(chart.props.accessibilityRole).toBe('image');
    });

    it('sıfır yükseklikli gizli etiket katmanı KULLANMAZ', () => {
      const plans: Plans = { '2026-09-05': [task('1', 'is')] };

      const { queryByText } = render(<CategoryDonutChart plans={plans} />);

      // Eski desende dilim adları görünmez metin olarak da basılıyordu.
      expect(queryByText('İş 1')).toBeNull();
    });
  });

  it('eksik gün listelerinde çökmez', () => {
    const plans = { '2026-09-05': undefined } as unknown as Plans;
    expect(() => render(<CategoryDonutChart plans={plans} />)).not.toThrow();
  });
});
