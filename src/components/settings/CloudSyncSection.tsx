import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/AppContext';
import { useCloudSync } from '../../hooks/useCloudSync';

const formatSyncTime = (value?: string | null) => {
  if (!value) return 'Henüz yok';
  return new Date(value).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
};

const formatExpiry = (value?: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

/**
 * Geri alınamaz işlemler için onay. react-native-web'de Alert.alert düğmeleri
 * çalışmadığı için web'de window.confirm kullanılır (PreferencesSection ile
 * aynı desen).
 */
const confirmDestructive = (title: string, message: string, confirmLabel: string, onConfirm: () => void) => {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }

  Alert.alert(title, message, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
};

export default function CloudSyncSection() {
  const theme = useTheme();
  const {
    isConfigured,
    isLoading,
    isSyncing,
    sessionEmail,
    household,
    isPaired,
    isHouseholdCreator,
    memberLimit,
    inviteExpiresAt,
    isInviteExpired,
    backupRecord,
    sendOtp,
    verifyOtp,
    signOut,
    createInvite,
    refreshInvite,
    joinHousehold,
    leaveHousehold,
    backupToCloud,
    restoreFromCloud,
    deleteBackup,
  } = useCloudSync();

  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [autoInviteRequested, setAutoInviteRequested] = useState(false);

  useEffect(() => {
    if (!sessionEmail) {
      setAutoInviteRequested(false);
    }
  }, [sessionEmail]);

  useEffect(() => {
    if (isConfigured && sessionEmail && !household && !isLoading && !autoInviteRequested) {
      setAutoInviteRequested(true);
      createInvite();
    }
  }, [autoInviteRequested, createInvite, household, isConfigured, isLoading, sessionEmail]);

  const partnerText = useMemo(() => {
    if (!household || !sessionEmail) return 'Partner bilgisi alınamadı';
    const partner = household.members.find(member => member.profile?.email !== sessionEmail);
    return partner?.profile?.email || 'Partner e-postası görünmüyor';
  }, [household, sessionEmail]);

  const lastBackupBy = backupRecord?.updatedByProfile?.email || backupRecord?.updated_by;
  const isBusy = isLoading || isSyncing;
  // 0002 migration'ı uygulanmadan önce kolon yok; o durumda süre satırı hiç çizilmez.
  const inviteExpiryText = formatExpiry(inviteExpiresAt);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    const sent = await sendOtp(email);
    setOtpSent(sent);
  };

  const handleVerifyOtp = async () => {
    if (!email.trim() || !otp.trim()) return;
    const verified = await verifyOtp(email, otp);
    if (verified) {
      setOtp('');
      setOtpSent(false);
    }
  };

  const confirmBackup = () => {
    Alert.alert(
      'Bulut yedeği güncellensin mi?',
      'Bu işlem ortak bulut yedeğinin üzerine bu cihazdaki verileri yazar.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Şimdi Yedekle', onPress: backupToCloud },
      ]
    );
  };

  const confirmRestore = () => {
    Alert.alert(
      'Buluttan geri yüklensin mi?',
      'Bu işlem bu cihazdaki yerel plan, ayar, tekrarlayan görev ve istatistikleri bulut yedeğiyle değiştirir.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Geri Yükle', style: 'destructive', onPress: restoreFromCloud },
      ]
    );
  };

  const confirmLeave = () => {
    Alert.alert(
      'Eşleştirme kaldırılsın mı?',
      'Bu cihaz bulut household üyeliğinden ayrılır. Yerel veriler silinmez. Ortak bulut yedeği de silinmez; silmek istiyorsan ayrılmadan önce "Bulut Yedeğini Sil" düğmesini kullan.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Ayrıl', style: 'destructive', onPress: leaveHousehold },
      ]
    );
  };

  // Yedek, ev grubunun ORTAK yedeği: silmek eşi de etkiler, bu yüzden onay
  // metninde açıkça yazıyor (R-009).
  const confirmDeleteBackup = () => {
    confirmDestructive(
      'Bulut yedeği silinsin mi?',
      'Bu yedek ev grubunun ORTAK yedeğidir: silersen eşin de buluttan geri yükleme yapamaz. Bu cihazdaki planların, ayarların ve istatistiklerin silinmez. İşlem geri alınamaz.',
      'Yedeği Sil',
      () => { deleteBackup(); }
    );
  };

  const renderDeleteBackup = () => (
    backupRecord ? (
      <View style={styles.buttonRow}>
        <SecondaryButton
          disabled={isBusy}
          label="Bulut Yedeğini Sil"
          textColor={theme.error}
          backgroundColor={theme.accentLight}
          onPress={confirmDeleteBackup}
        />
      </View>
    ) : null
  );

  const renderSetupRequired = () => (
    <View style={[styles.noticeBox, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
      <Text style={[styles.noticeTitle, { color: theme.text }]}>Kurulum gerekli</Text>
      <Text style={[styles.description, { color: theme.textSecondary }]}>Bulut senkronizasyonu için Supabase URL ve anon key ortam değişkenleri tanımlanmalı. Kurulum yapılmazsa uygulama yerel modda çalışmaya devam eder.</Text>
    </View>
  );

  const renderSignedOut = () => (
    <>
      <Text style={[styles.description, { color: theme.textSecondary }]}>E-postanıza gönderilen 6 haneli kodla şifresiz giriş yapın.</Text>
      <TextInput
        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
        placeholder="E-posta"
        placeholderTextColor={theme.textMuted}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        editable={!isBusy}
      />
      {otpSent && (
        <TextInput
          style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
          placeholder="6 haneli kod"
          placeholderTextColor={theme.textMuted}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={6}
          editable={!isBusy}
        />
      )}
      <View style={styles.buttonRow}>
        <GradientButton disabled={!email.trim() || isBusy} colors={theme.accentGradient} label={otpSent ? 'Kodu Tekrar Gönder' : 'Kod Gönder'} onPress={handleSendOtp} />
        {otpSent && <GradientButton disabled={otp.trim().length !== 6 || isBusy} colors={theme.blueGradient} label="Doğrula" onPress={handleVerifyOtp} />}
      </View>
    </>
  );

  const renderUnpaired = () => (
    <>
      <View style={styles.statusRow}>
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>Giriş:</Text>
        <Text style={[styles.metaValue, { color: theme.text }]}>{sessionEmail}</Text>
      </View>
      <Text style={[styles.description, { color: theme.textSecondary }]}>Bu kodu partnerinizle paylaşın veya partnerinizin 6 karakterlik kodunu girerek ortak household'a katılın.</Text>
      <View style={[styles.inviteBox, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
        <Text style={[styles.inviteLabel, { color: theme.textSecondary }]}>Davet Kodunuz</Text>
        <Text selectable style={[styles.inviteCodeText, { color: theme.text }]}>{household?.invite_code || 'Oluşturuluyor...'}</Text>
        {inviteExpiryText && (
          <Text style={[styles.inviteMeta, { color: isInviteExpired ? theme.error : theme.textSecondary }]}>
            {isInviteExpired ? 'Kodun süresi doldu, yenileyin' : `Son geçerlilik: ${inviteExpiryText}`}
          </Text>
        )}
      </View>
      <TextInput
        style={[styles.input, { backgroundColor: theme.background, color: theme.text, borderColor: theme.border }]}
        placeholder="Partner davet kodu"
        placeholderTextColor={theme.textMuted}
        value={inviteCode}
        onChangeText={(value) => setInviteCode(value.toLocaleUpperCase('tr-TR'))}
        autoCapitalize="characters"
        maxLength={6}
        editable={!isBusy}
      />
      <View style={styles.buttonRow}>
        <GradientButton disabled={inviteCode.trim().length !== 6 || isBusy} colors={theme.accentGradient} label="Eşleştir" onPress={() => joinHousehold(inviteCode)} />
        <SecondaryButton disabled={isBusy} label="Çıkış Yap" textColor={theme.textSecondary} backgroundColor={theme.accentLight} onPress={signOut} />
      </View>
      {isHouseholdCreator && (
        <View style={styles.buttonRow}>
          <SecondaryButton disabled={isBusy} label="Yeni Kod Oluştur" textColor={theme.textSecondary} backgroundColor={theme.accentLight} onPress={refreshInvite} />
        </View>
      )}
      {renderDeleteBackup()}
    </>
  );

  const renderPaired = () => (
    <>
      <View style={styles.statusRow}>
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>Partner:</Text>
        <Text style={[styles.metaValue, { color: theme.text }]}>{partnerText}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>Ev grubu:</Text>
        <Text style={[styles.metaValue, { color: theme.text }]}>{`${household?.members.length ?? 0}/${memberLimit} kişi`}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>Son senkron:</Text>
        <Text style={[styles.metaValue, { color: theme.text }]}>{formatSyncTime(backupRecord?.updated_at)}</Text>
      </View>
      <View style={styles.statusRow}>
        <Text style={[styles.metaText, { color: theme.textSecondary }]}>Son yedekleyen:</Text>
        <Text style={[styles.metaValue, { color: theme.text }]}>{lastBackupBy || 'Henüz yok'}</Text>
      </View>
      <View style={styles.buttonRow}>
        <GradientButton disabled={isBusy} colors={theme.accentGradient} label={isSyncing ? 'Yedekleniyor...' : 'Şimdi Yedekle'} onPress={confirmBackup} />
        <GradientButton disabled={isBusy || !backupRecord} colors={theme.blueGradient} label={isSyncing ? 'İndiriliyor...' : 'Buluttan Geri Yükle'} onPress={confirmRestore} />
      </View>
      <View style={styles.buttonRow}>
        <SecondaryButton disabled={isBusy} label="Eşleştirmeden Ayrıl" textColor={theme.textSecondary} backgroundColor={theme.accentLight} onPress={confirmLeave} />
        <SecondaryButton disabled={isBusy} label="Çıkış Yap" textColor={theme.textSecondary} backgroundColor={theme.accentLight} onPress={signOut} />
      </View>
      {renderDeleteBackup()}
    </>
  );

  return (
    <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>☁️ Bulut Senkronizasyonu</Text>
      {!isConfigured ? renderSetupRequired() : !sessionEmail ? renderSignedOut() : !isPaired ? renderUnpaired() : renderPaired()}
    </View>
  );
}

function GradientButton({ disabled, colors, label, onPress }: { disabled: boolean; colors: readonly [string, string, ...string[]]; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.actionButton, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <LinearGradient colors={disabled ? ['#777777', '#777777'] : colors} style={styles.buttonGradient}>
        <Text style={styles.buttonText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SecondaryButton({ disabled, label, textColor, backgroundColor, onPress }: { disabled: boolean; label: string; textColor: string; backgroundColor: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.secondaryButton, { backgroundColor }, disabled && styles.disabled]} onPress={onPress} disabled={disabled}>
      <Text style={[styles.secondaryButtonText, { color: textColor }]}>{label}</Text>
    </TouchableOpacity>
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
  noticeBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 8,
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
    marginTop: 4,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  secondaryButtonText: {
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.55,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 10,
  },
  metaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  metaValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
  },
  inviteBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  inviteLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  inviteCodeText: {
    fontSize: 28,
    letterSpacing: 5,
    fontWeight: '900',
  },
  inviteMeta: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
  },
});
