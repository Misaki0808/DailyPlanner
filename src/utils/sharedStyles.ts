import { StyleSheet } from 'react-native';

/**
 * Uygulama genelinde tekrar eden ortak stiller.
 * Bileşenlerde `import { sharedStyles } from '../utils/sharedStyles'` ile kullanılır.
 */
export const sharedStyles = StyleSheet.create({
  /**
   * Glass-morphism kart stili.
   * Yarı saydam beyaz arka plan, yuvarlak köşeler, ince kenarlık.
   */
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
  },

  /**
   * glassCard içinde padding'li versiyon (iç içerik olan kartlar için).
   */
  glassCardPadded: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    overflow: 'hidden',
    padding: 16,
  },

  /**
   * Bölüm başlığı — "📊 İstatistikler", "🔁 Tekrarlayan Görevler" vb.
   */
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 16,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  /**
   * Alt başlık / label stili — "📅 Tarih Seçin", "✏️ Manuel Görev Ekle" vb.
   */
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  /**
   * Glass-morphism border'siz kart (CreatePlan paragraf input gibi).
   */
  glassCardNoBorder: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  /**
   * Görev kartı — AnimatedTaskItem'da kullanılan opak kart.
   * Yarı saydam değil, gölgeli.
   */
  taskCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
});
