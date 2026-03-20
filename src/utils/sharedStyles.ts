import { StyleSheet } from 'react-native';
import { Theme } from './theme';

/**
 * Tema-duyarlı ortak stiller oluşturur.
 * `import { createSharedStyles } from '../utils/sharedStyles'`
 * Kullanım: `const styles = createSharedStyles(theme);`
 */
export const createSharedStyles = (theme: Theme) =>
  StyleSheet.create({
    glassCard: {
      backgroundColor: theme.cardBackground,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
    },

    glassCardPadded: {
      backgroundColor: theme.cardBackground,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: theme.border,
      overflow: 'hidden',
      padding: 16,
    },

    sectionTitle: {
      fontSize: 22,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 16,
    },

    label: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.text,
      marginBottom: 12,
    },

    glassCardNoBorder: {
      backgroundColor: theme.cardBackground,
      borderRadius: 20,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 8,
      elevation: 4,
    },

    taskCard: {
      backgroundColor: theme.taskCardBackground,
      borderRadius: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 5,
    },
  });

/**
 * Statik fallback — tema bilgisi olmadan kullanılacak bileşenler için.
 * Mümkünse createSharedStyles(theme) tercih edin.
 */
export const sharedStyles = StyleSheet.create({
  glassCard: {
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(48, 54, 61, 0.8)',
    overflow: 'hidden',
  },
  glassCardPadded: {
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(48, 54, 61, 0.8)',
    overflow: 'hidden',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#E6EDF3',
    marginBottom: 16,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E6EDF3',
    marginBottom: 12,
  },
  glassCardNoBorder: {
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  taskCard: {
    backgroundColor: '#161B22',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
});
