import { extractTimesLocal } from '../../src/utils/timeParser';

describe('extractTimesLocal', () => {
  it('extracts HH:MM and Turkish suffix hour patterns', () => {
    expect(extractTimesLocal("8'de markete git, 14:30'da toplantı var")).toEqual([
      { hour: 8, minute: 0, label: 'Markete git' },
      { hour: 14, minute: 30, label: 'Toplantı var' },
    ]);
  });

  it('maps day period words with numbers to 24-hour time', () => {
    expect(extractTimesLocal("Sabah 8'de kalkacağım. Akşam 7'de spor. Gece 11'de yat.")).toEqual([
      { hour: 8, minute: 0, label: 'Kalkacağım' },
      { hour: 19, minute: 0, label: 'Spor' },
      { hour: 23, minute: 0, label: 'Yat' },
    ]);
  });

  it('handles noon words as a concrete 12:00 reference', () => {
    expect(extractTimesLocal('Öğlen yemek ye')).toEqual([
      { hour: 12, minute: 0, label: 'Yemek ye' },
    ]);
    expect(extractTimesLocal('öğle de ilaç al')).toEqual([
      { hour: 12, minute: 0, label: 'İlaç al' },
    ]);
  });

  it('does not extract vague period-only expressions except noon', () => {
    expect(extractTimesLocal('Sabah spor yap, akşam kitap oku, gece çalış')).toEqual([]);
  });

  it('keeps minutes from period based time expressions', () => {
    expect(extractTimesLocal("akşam 7:45'te yürüyüş yap")).toEqual([
      { hour: 19, minute: 45, label: 'Yürüyüş yap' },
    ]);
  });
});
