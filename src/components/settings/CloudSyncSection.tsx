import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../../context/AppContext';
import { useCloudSync } from '../../hooks/useCloudSync';

export default function CloudSyncSection() {
  const { theme } = useApp();
  const { isSyncing, backupToCloud, restoreFromCloud } = useCloudSync();
  const [email, setEmail] = useState('');

  const handleBackup = () => {
    if (!email) return;
    backupToCloud(email);
  };

  const handleRestore = () => {
    if (!email) return;
    restoreFromCloud(email);
  };

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>☁️ Bulut Senkronizasyonu (Beta)</Text>
      
      <Text style={[styles.description, { color: theme.textSecondary }]}>
        Tüm görevlerinizi, istatistiklerinizi ve ayarlarınızı buluta yedekleyin. Supabase altyapısı kullanmaktadır.
      </Text>

      <TextInput
        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
        placeholder="Hesap E-postası"
        placeholderTextColor={theme.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <View style={styles.buttonRow}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleBackup}
          disabled={!email || isSyncing}
        >
          <LinearGradient
            colors={!email ? [theme.background, theme.background] : theme.accentGradient}
            style={styles.buttonGradient}
          >
            <Text style={[styles.buttonText, !email && { color: theme.textMuted }]}>
              {isSyncing ? 'Yedekleniyor...' : '☁️ Yedekle'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleRestore}
          disabled={!email || isSyncing}
        >
          <LinearGradient
            colors={!email ? [theme.background, theme.background] : theme.blueGradient}
            style={styles.buttonGradient}
          >
            <Text style={[styles.buttonText, !email && { color: theme.textMuted }]}>
              {isSyncing ? 'İndiriliyor...' : '📥 Geri Yükle'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  }
});
