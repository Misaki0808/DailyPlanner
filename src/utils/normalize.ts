/**
 * Locale'den BAĞIMSIZ normalleştirme yardımcıları.
 *
 * Uygulamanın arayüzü Türkçe olsa da e-posta adresi ve davet kodu gibi
 * teknik tanımlayıcılar ASCII kurallarına tabidir. Türkçe locale'de
 * `'I'.toLocaleLowerCase('tr-TR')` noktasız `'ı'` üretir; bu yüzden
 * "EFE@GMAIL.COM" adresi "efe@gmaıl.com" hâline gelip OTP hiç ulaşmaz.
 * Aynı şekilde `'i'.toLocaleUpperCase('tr-TR')` `'İ'` üretir ve davet kodu
 * veritabanındaki `^[A-Z0-9]{6}$` kısıtına takılır.
 *
 * Bu yüzden burada locale duyarlı sürümler KULLANILMAZ.
 */

/** E-posta adresini boşluklardan arındırır ve ASCII küçük harfe çevirir. */
export const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/** Davet kodunu boşluklardan arındırır ve ASCII büyük harfe çevirir. */
export const normalizeInviteCode = (code: string): string => code.trim().toUpperCase();
