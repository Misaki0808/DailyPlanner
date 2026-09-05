import { normalizeEmail, normalizeInviteCode } from '../../src/utils/normalize';

describe('normalizeEmail', () => {
  // Regresyon (R-003): toLocaleLowerCase('tr-TR') büyük I'yı noktasız ı'ya
  // çeviriyordu; "GMAIL.COM" içinde I bulunduğu için adresini büyük harfle
  // yazan HER kullanıcının OTP'si geçersiz bir adrese gidiyordu.
  it("büyük harfli adresteki I'yı noktasız ı'ya çevirmez", () => {
    expect(normalizeEmail('EFE@GMAIL.COM')).toBe('efe@gmail.com');
    expect(normalizeEmail('INFO@Firma.COM')).toBe('info@firma.com');
    expect(normalizeEmail('ISMAIL@HOTMAIL.COM')).toBe('ismail@hotmail.com');
  });

  it('noktasız ı üretmediğini açıkça doğrular', () => {
    expect(normalizeEmail('EFE@GMAIL.COM')).not.toContain('ı');
  });

  it('baştaki ve sondaki boşlukları temizler', () => {
    expect(normalizeEmail('  efe@gmail.com  ')).toBe('efe@gmail.com');
  });

  it('zaten küçük harfli adresi değiştirmez', () => {
    expect(normalizeEmail('efe@gmail.com')).toBe('efe@gmail.com');
  });
});

describe('normalizeInviteCode', () => {
  // Regresyon (R-012): toLocaleUpperCase('tr-TR') küçük i'yi İ'ye çeviriyordu;
  // veritabanı kısıtı ise ^[A-Z0-9]{6}$ bekliyor.
  it("küçük i'yi İ'ye çevirmez", () => {
    expect(normalizeInviteCode('abcdi9')).toBe('ABCDI9');
    expect(normalizeInviteCode('abcdi9')).not.toContain('İ');
  });

  it('sonuç veritabanı kısıtına (^[A-Z0-9]{6}$) uyar', () => {
    expect(normalizeInviteCode(' k7i2mn ')).toMatch(/^[A-Z0-9]{6}$/);
  });

  it('zaten büyük harfli kodu değiştirmez', () => {
    expect(normalizeInviteCode('K7M2NP')).toBe('K7M2NP');
  });
});
