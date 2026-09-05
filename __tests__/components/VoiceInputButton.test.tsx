import React from 'react';
import { Platform } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

/**
 * Web konuşma tanıma sahtesi. Gerçek API gibi olay işleyicilerini örnek
 * üzerinde tutar; testler bunları elle tetikleyerek tarayıcı davranışını
 * taklit eder.
 */
class FakeRecognition {
  static instances: FakeRecognition[] = [];
  lang?: string;
  interimResults = false;
  continuous = false;
  maxAlternatives = 0;
  onresult: ((event: any) => void) | null = null;
  onerror: ((event: any) => void) | null = null;
  onend: (() => void) | null = null;
  started = false;
  stopped = false;

  constructor() {
    FakeRecognition.instances.push(this);
  }

  start() { this.started = true; }
  stop() { this.stopped = true; }

  /**
   * Tarayıcının kesinleşmiş bir sonuç göndermesini taklit eder.
   * Olay işleyicileri React state'ini değiştirdiği için act() ile sarılır;
   * aksi halde render yenilenmez ve düğme etiketi eski kalır.
   */
  emitFinal(transcript: string) {
    act(() => {
    this.onresult?.({
      resultIndex: 0,
      results: Object.assign([[{ transcript }]], { length: 1, 0: Object.assign([{ transcript }], { isFinal: true }) }),
    });
    });
  }

  /** Tanımanın kendiliğinden ya da stop() sonrası bitmesini taklit eder. */
  emitEnd() { act(() => { this.onend?.(); }); }
}

// Bileşen, modül yüklenirken Platform.OS'a bakıp native konuşma modülünü
// require ediyor. Bu yüzden platform import'tan ÖNCE ayarlanmalı; modül de
// tek sefer yüklenmeli (jest.resetModules ikinci bir React kopyası yaratır
// ve hook'lar çalışmaz).
(Platform as any).OS = 'web';
(globalThis as any).window = globalThis;
const VoiceInputButton = require('../../src/components/VoiceInputButton').default;

describe('VoiceInputButton (web)', () => {
  beforeEach(() => {
    FakeRecognition.instances = [];
    (globalThis as any).SpeechRecognition = FakeRecognition;
  });

  afterEach(() => {
    delete (globalThis as any).SpeechRecognition;
  });

  const startListening = (onTranscript: jest.Mock) => {
    const utils = render(<VoiceInputButton onTranscript={onTranscript} />);
    fireEvent.press(utils.getByLabelText('Sesli giriş başlat'));
    return { ...utils, recognition: FakeRecognition.instances.at(-1)! };
  };

  it('tanımayı Türkçe dille başlatır', () => {
    const onTranscript = jest.fn();
    const { recognition } = startListening(onTranscript);

    expect(recognition.started).toBe(true);
    // Regresyon: web tarafında lang hiç atanmıyordu; tarayıcı kendi
    // varsayılan diliyle çalışıyor ve Türkçe konuşma yanlış çözümleniyordu.
    expect(recognition.lang).toBe('tr-TR');
    expect(recognition.continuous).toBe(true);
  });

  it('konuşma bitince düzeltilmiş metni final olarak gönderir', () => {
    const onTranscript = jest.fn();
    const { recognition } = startListening(onTranscript);

    recognition.emitFinal('backent çalış');
    recognition.emitEnd();

    expect(onTranscript).toHaveBeenLastCalledWith('backend çalış', true);
  });

  // Regresyon: startListening, finalTranscriptRef'i sıfırlamıyordu (native
  // taraf sıfırlıyor). Kullanıcı mikrofonu açıp HİÇBİR ŞEY söylemeden
  // kapattığında onend, bir önceki oturumdan kalan metni yeniden "final"
  // olarak gönderiyor ve aynı görev ikinci kez ekleniyordu.
  it('yeni oturumda önceki metni yeniden göndermez', () => {
    const onTranscript = jest.fn();
    const { getByLabelText, recognition } = startListening(onTranscript);

    recognition.emitFinal('Spor yap');
    recognition.emitEnd();
    expect(onTranscript).toHaveBeenLastCalledWith('Spor yap', true);

    // İkinci oturum: mikrofon açılıp hiçbir şey söylenmeden kapatılıyor
    onTranscript.mockClear();
    fireEvent.press(getByLabelText('Sesli giriş başlat'));
    const second = FakeRecognition.instances.at(-1)!;
    second.emitEnd();

    expect(onTranscript).not.toHaveBeenCalled();
  });

  // Regresyon: dinleme sürerken ekrandan çıkıldığında tanıma durdurulmuyordu;
  // mikrofon açık kalıyor ve olaylar kaldırılmış bileşene ulaşıyordu.
  it('dinlerken ekrandan çıkılırsa tanımayı durdurur', () => {
    const onTranscript = jest.fn();
    const { unmount, recognition } = startListening(onTranscript);

    expect(recognition.stopped).toBe(false);
    unmount();

    expect(recognition.stopped).toBe(true);
  });

  it('dinleme yokken unmount olursa bir şey durdurmaya çalışmaz', () => {
    const { unmount } = render(<VoiceInputButton onTranscript={jest.fn()} />);

    expect(() => unmount()).not.toThrow();
    expect(FakeRecognition.instances).toHaveLength(0);
  });

  it('durdurma düğmesi tanımayı durdurur', () => {
    const onTranscript = jest.fn();
    const { getByLabelText, recognition } = startListening(onTranscript);

    fireEvent.press(getByLabelText('Sesli girişi durdur'));

    expect(recognition.stopped).toBe(true);
  });

  it('devre dışıyken tanımayı başlatmaz', () => {
    const { getByLabelText } = render(
      <VoiceInputButton onTranscript={jest.fn()} disabled />
    );

    fireEvent.press(getByLabelText('Sesli giriş başlat'));

    expect(FakeRecognition.instances).toHaveLength(0);
  });
});
