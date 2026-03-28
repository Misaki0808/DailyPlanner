import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Share,
  TextInput,
  Animated as RNAnimated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { formatDateDisplay, getToday, addDays } from '../utils/dateUtils';
import { Task } from '../types';
import CopyPlanModal from '../components/CopyPlanModal';
import ShareModal from '../components/ShareModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import AnimatedTaskItem from '../components/AnimatedTaskItem';
import DateNavigation from '../components/planner/DateNavigation';
import FlexibleTaskPool from '../components/planner/FlexibleTaskPool';
import ActionButtonsBar from '../components/planner/ActionButtonsBar';
import DayStatsBar from '../components/planner/DayStatsBar';
import { getCategoryEmoji, getCategoryLabel, getCategoryColor, TASK_CATEGORIES } from '../utils/categories';
import { formatDateDisplay as formatDisplay } from '../utils/dateUtils';

// Sadece native platformlarda import et
let RNShare: any = null;
if (Platform.OS !== 'web') {
  try {
    RNShare = require('react-native-share').default;
  } catch (e) {
    // react-native-share not available on web
  }
}

export default function MultiDayViewScreen() {
  const { plans, updateTask, savePlan, deletePlan, settings, theme, recurringTasks } = useApp();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoAnim = useRef(new RNAnimated.Value(0)).current;
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCats, setSelectedFilterCats] = useState<string[]>([]);
  const [showCatFilter, setShowCatFilter] = useState(false);

  // Seçilen tarih değiştiğinde görevleri güncelle
  useEffect(() => {
    const tasks = plans[selectedDate] || [];
    setCurrentTasks(tasks);
  }, [selectedDate, plans]);

  // Tarih değiştir
  const changeDate = (days: number) => {
    setSelectedDate(addDays(selectedDate, days));
  };

  // Tamamlanma durumu
  const completedCount = currentTasks.filter(task => task.done).length;
  const totalCount = currentTasks.length;
  const allCompleted = totalCount > 0 && completedCount === totalCount;

  // Yüzdelik hesaplama (priority'ye göre ağırlıklı)
  const calculatePercentage = () => {
    if (totalCount === 0) return 0;
    const totalWeight = currentTasks.reduce((sum, task) => {
      const weight = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
      return sum + weight;
    }, 0);
    const completedWeight = currentTasks
      .filter(task => task.done)
      .reduce((sum, task) => {
        const weight = task.priority === 'high' ? 3 : task.priority === 'medium' ? 2 : 1;
        return sum + weight;
      }, 0);
    return Math.round((completedWeight / totalWeight) * 100);
  };
  const percentage = calculatePercentage();

  // Görev durumunu değiştir
  const toggleTaskDone = async (taskId: string, currentDone: boolean) => {
    try {
      await updateTask(selectedDate, taskId, { done: !currentDone });
  
    } catch (error) {
      console.error('Görev güncellenirken hata:', error);
    }
  };

  // Görev sil + geri al desteği
  const handleRemoveTask = async (taskId: string) => {
    const taskToDelete = currentTasks.find(task => task.id === taskId);
    const updatedTasks = currentTasks.filter(task => task.id !== taskId);
    await savePlan(selectedDate, updatedTasks);

    if (taskToDelete) {
      setDeletedTask(taskToDelete);
      if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
      RNAnimated.timing(undoAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
      undoTimeoutRef.current = setTimeout(() => {
        RNAnimated.timing(undoAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setDeletedTask(null);
        });
      }, 5000);
    }
  };

  // Geri al
  const handleUndoDelete = async () => {
    if (!deletedTask) return;
    if (undoTimeoutRef.current) clearTimeout(undoTimeoutRef.current);
    const restoredTasks = [...currentTasks, deletedTask];
    await savePlan(selectedDate, restoredTasks);

    RNAnimated.timing(undoAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start();
    setDeletedTask(null);
  };

  // Hızlı görev ekle
  const handleQuickAddTask = async () => {
    const title = quickAddText.trim();
    if (!title) return;
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(),
      title,
      done: false,
      priority: 'low',
    };
    const updatedTasks = [...currentTasks, newTask];
    await savePlan(selectedDate, updatedTasks);

    setQuickAddText('');
  };

  // Esnek görev havuzundan bugüne ekle
  const handleAddFlexibleTask = async (title: string, priority: 'low' | 'medium' | 'high') => {
    const newTask: Task = {
      id: Date.now().toString() + Math.random().toString(),
      title,
      done: false,
      priority,
    };
    const updatedTasks = [...currentTasks, newTask];
    await savePlan(selectedDate, updatedTasks);

  };

  // Priority değiştir
  const handleChangePriority = async (taskId: string) => {
    const updatedTasks = currentTasks.map(task => {
      if (task.id === taskId) {
        const nextPriority: 'low' | 'medium' | 'high' =
          task.priority === 'low' ? 'medium' :
            task.priority === 'medium' ? 'high' : 'low';
        return { ...task, priority: nextPriority };
      }
      return task;
    });
    await savePlan(selectedDate, updatedTasks);

  };

  // Not düzenle/sil
  const handleNoteEdit = async (taskId: string, note: string | undefined, title?: string, category?: string) => {
    const updatedTasks = currentTasks.map(task => {
      if (task.id !== taskId) return task;
      const updated = { ...task, note };
      if (title !== undefined) updated.title = title;
      if (category !== undefined) updated.category = category;
      return updated;
    });
    await savePlan(selectedDate, updatedTasks);

  };

  // Tüm günü sil
  const handleDeleteDay = async () => {
    if (settings?.askBeforeDeleteAll) {
      if (Platform.OS === 'web') {
        setIsDeleteModalVisible(true);
      } else {
        Alert.alert(
          'Tüm Planları Sil',
          `${formatDateDisplay(selectedDate)} tarihindeki tüm görevleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`,
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Sil', style: 'destructive', onPress: confirmDelete }
          ]
        );
      }
    } else {
      await confirmDelete();
    }
  };

  const confirmDelete = async () => {
    await deletePlan(selectedDate);
    setCurrentTasks([]);
    setIsEditMode(false);
  };

  // Esnek görevlerin o haftaki ilerlemesini hesapla
  const getFlexibleTasksProgress = () => {
    const flexibleTasks = recurringTasks.filter(rt => rt.isActive && rt.frequency === 'flexible' && rt.flexibleTarget);
    if (flexibleTasks.length === 0) return [];

    const todayObj = new Date(selectedDate);
    const dayOfWeek = todayObj.getDay() === 0 ? 7 : todayObj.getDay();
    const mondayObj = new Date(todayObj);
    mondayObj.setDate(todayObj.getDate() - dayOfWeek + 1);

    const weekDates = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(mondayObj);
      d.setDate(mondayObj.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    });

    return flexibleTasks.map(rt => {
      let currentCount = 0;
      let isAddedToday = false;
      const titleLower = rt.title.toLowerCase();
      weekDates.forEach(date => {
        const dayTasks = plans[date] || [];
        if (dayTasks.some(t => t.title.toLowerCase() === titleLower)) {
          currentCount++;
          if (date === selectedDate) isAddedToday = true;
        }
      });
      return { ...rt, currentCount, isAddedToday };
    }).filter(rt => rt.currentCount < (rt.flexibleTarget || 0) || rt.isAddedToday);
  };

  const flexibleProgress = getFlexibleTasksProgress();

  // Planı kopyala
  const handleCopyPlan = async (targetDate: string, selectedTasks: Task[]) => {
    const existingTasks = plans[targetDate] || [];
    const newTasks = selectedTasks.map(task => ({
      ...task,
      id: Date.now().toString() + Math.random().toString(),
      done: false,
    }));
    const allTasks = [...existingTasks, ...newTasks];
    await savePlan(targetDate, allTasks);

    Alert.alert('Başarılı', `${selectedTasks.length} görev ${targetDate} tarihine kopyalandı.`, [{ text: 'Tamam' }]);
  };

  // Paylaşım metni oluştur
  const getShareText = () => {
    let shareText = `📅 ${formatDateDisplay(selectedDate)}\n`;
    shareText += `📝 Bugünkü Planım (${completedCount}/${totalCount} tamamlandı)\n\n`;
    currentTasks.forEach((task, index) => {
      const emoji = task.done ? '✅' : '⬜';
      const priorityEmoji = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';
      shareText += `${emoji} ${priorityEmoji} ${index + 1}. ${task.title}\n`;
    });
    shareText += `\n💪 ${percentage}% tamamlandı!\n`;
    shareText += `\n#DailyPlanner #PlanımıPaylaşıyorum`;
    return shareText;
  };

  // Planı paylaş
  const handleSharePlan = async () => {
    if (currentTasks.length === 0) {
      if (Platform.OS === 'web') window.alert('Paylaşılacak görev yok');
      else Alert.alert('Uyarı', 'Paylaşılacak görev yok');
      return;
    }
    try {
      if (Platform.OS === 'web') {
        setIsShareModalVisible(true);
      } else {
        const shareText = getShareText();
        if (RNShare) {
          try {
            await RNShare.open({ message: shareText, social: RNShare.Social.WHATSAPP, failOnCancel: false });
          } catch (err: any) {
            if (err.message !== 'User did not share') await Share.share({ message: shareText });
          }
        } else {
          await Share.share({ message: shareText });
        }
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error);
      if (Platform.OS === 'web') window.alert('Plan paylaşılırken hata oluştu');
      else Alert.alert('Hata', 'Plan paylaşılırken hata oluştu');
    }
  };

  const shareViaWhatsApp = () => {
    const encodedText = encodeURIComponent(getShareText());
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  const copyToClipboard = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(getShareText());
        window.alert('✅ Plan metni kopyalandı!');
      } else {
        window.alert('❌ Kopyalama desteklenmiyor');
      }
    } catch (error) {
      window.alert('❌ Kopyalama başarısız');
    }
  };

  return (
    <LinearGradient
      colors={theme.primaryGradient}
      style={styles.gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.container}>
        {/* Tarih Navigasyonu */}
        <View style={styles.dateNavigation}>
          <View style={styles.dateNavWithSearch}>
            <View style={{ flex: 1 }}>
              <DateNavigation
                selectedDate={selectedDate}
                onChangeDate={changeDate}
              />
            </View>
            <TouchableOpacity
              style={[styles.searchToggle, isSearchMode && { backgroundColor: theme.accent + '30' }]}
              onPress={() => { setIsSearchMode(!isSearchMode); setSearchQuery(''); }}
            >
              <Text style={styles.searchToggleIcon}>{isSearchMode ? '✕' : '🔍'}</Text>
            </TouchableOpacity>
          </View>

          {/* Arama Çubuğu */}
          {isSearchMode && (
            <View style={[styles.searchBar, { backgroundColor: theme.accentLight, borderColor: theme.border }]}>
              <Text style={styles.searchBarIcon}>🔍</Text>
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Görev veya kategori ara..."
                placeholderTextColor={theme.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Text style={[styles.searchClear, { color: theme.textMuted }]}>✕</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.filterToggle, showCatFilter && { backgroundColor: theme.accent + '30' }]}
                onPress={() => setShowCatFilter(!showCatFilter)}
              >
                <Text style={styles.filterToggleIcon}>⚙️</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Kategori Filtreleri */}
          {isSearchMode && showCatFilter && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catFilterRow}>
              {TASK_CATEGORIES.map(cat => {
                const isActive = selectedFilterCats.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[
                      styles.catFilterChip,
                      { borderColor: cat.color + '60', backgroundColor: isActive ? cat.color + '30' : theme.accentLight },
                      isActive && { borderColor: cat.color },
                    ]}
                    onPress={() => {
                      setSelectedFilterCats(prev =>
                        prev.includes(cat.id)
                          ? prev.filter(c => c !== cat.id)
                          : [...prev, cat.id]
                      );
                    }}
                  >
                    <Text style={styles.catFilterEmoji}>{cat.emoji}</Text>
                    <Text style={[styles.catFilterLabel, { color: isActive ? cat.color : theme.textSecondary }]}>{cat.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {/* Arama Sonuçları */}
          {isSearchMode && (searchQuery.length > 1 || selectedFilterCats.length > 0) && (() => {
            const query = searchQuery.toLowerCase().trim();
            const results: { date: string; task: Task }[] = [];
            Object.entries(plans).forEach(([date, tasks]) => {
              tasks.forEach(task => {
                // Kategori filtresi aktifse önce kontrol et
                if (selectedFilterCats.length > 0 && !selectedFilterCats.includes(task.category || 'diger')) {
                  return;
                }

                // Metin araması (boş query + aktif filtre = tüm filtrelenen görevleri göster)
                if (query.length <= 1) {
                  results.push({ date, task });
                  return;
                }

                // Büyük/küçük harf duyarsız arama + kategori label eşleşmesi
                const catLabel = getCategoryLabel(task.category).toLowerCase();
                if (
                  task.title.toLowerCase().includes(query) ||
                  task.note?.toLowerCase().includes(query) ||
                  catLabel.includes(query)
                ) {
                  results.push({ date, task });
                }
              });
            });
            // En yeni tarih önce
            results.sort((a, b) => b.date.localeCompare(a.date));

            if (results.length === 0) {
              return (
                <View style={[styles.searchResults, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Text style={[styles.searchNoResult, { color: theme.textMuted }]}>Sonuç bulunamadı</Text>
                </View>
              );
            }

            return (
              <ScrollView style={[styles.searchResults, { backgroundColor: theme.cardBackground, borderColor: theme.border }]} nestedScrollEnabled>
                {results.slice(0, 30).map((r, i) => (
                  <TouchableOpacity
                    key={`${r.date}-${r.task.id}-${i}`}
                    style={[styles.searchResultItem, { borderBottomColor: theme.border }]}
                    onPress={() => {
                      setSelectedDate(r.date);
                      setIsSearchMode(false);
                      setSearchQuery('');
                      setSelectedFilterCats([]);
                      setShowCatFilter(false);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.searchResultTitle, { color: theme.text }]}>
                        {r.task.done ? '✅ ' : '⬜ '}{r.task.title}
                      </Text>
                      <View style={styles.searchResultMeta}>
                        <Text style={[styles.searchResultDate, { color: theme.textSecondary }]}>
                          📅 {formatDisplay(r.date)}
                        </Text>
                        {r.task.category && (
                          <Text style={[styles.searchResultCat, { color: getCategoryColor(r.task.category) }]}>
                            {getCategoryEmoji(r.task.category)} {getCategoryLabel(r.task.category)}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={[styles.searchResultArrow, { color: theme.textMuted }]}>›</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            );
          })()}

          {/* Esnek Görev Havuzu */}
          {!isSearchMode && (
            <FlexibleTaskPool
              flexibleProgress={flexibleProgress}
              onAddFlexibleTask={handleAddFlexibleTask}
            />
          )}

          {/* Buton Grubu */}
          {!isSearchMode && totalCount > 0 && (
            <ActionButtonsBar
              isEditMode={isEditMode}
              quickAddText={quickAddText}
              onSetEditMode={setIsEditMode}
              onQuickAddTextChange={setQuickAddText}
              onQuickAddSubmit={handleQuickAddTask}
              onSharePlan={handleSharePlan}
              onCopyPlan={() => setIsCopyModalVisible(true)}
              onDeleteDay={handleDeleteDay}
            />
          )}
        </View>

        {/* İstatistik */}
        <DayStatsBar
          completedCount={completedCount}
          totalCount={totalCount}
          percentage={percentage}
          allCompleted={allCompleted}
        />

        {/* Görev Listesi */}
        <ScrollView style={styles.taskList}>
          {currentTasks.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyStateCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Text style={styles.emptyStateIcon}>📭</Text>
                <Text style={[styles.emptyStateTitle, { color: theme.text }]}>Bu gün için plan yok</Text>
                <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                  "Plan Oluştur" sekmesinden yeni plan ekleyebilirsiniz
                </Text>
              </View>
            </View>
          ) : (
            currentTasks.map((task, index) => (
              <AnimatedTaskItem
                key={task.id}
                task={task}
                index={index}
                totalCount={currentTasks.length}
                isEditMode={isEditMode}
                onToggleDone={() => toggleTaskDone(task.id, task.done)}
                onChangePriority={() => handleChangePriority(task.id)}
                onRemove={() => handleRemoveTask(task.id)}
                onNoteEdit={handleNoteEdit}
              />
            ))
          )}
        </ScrollView>

        {/* Geri Al Snackbar */}
        {deletedTask && (
          <RNAnimated.View style={[
            styles.undoSnackbar,
            {
              backgroundColor: theme.modalBackground,
              opacity: undoAnim,
              transform: [{ translateY: undoAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) }],
            },
          ]}>
            <Text style={[styles.undoText, { color: theme.text }]} numberOfLines={1}>{deletedTask.title} silindi</Text>
            <TouchableOpacity onPress={handleUndoDelete} activeOpacity={0.7}>
              <LinearGradient
                colors={theme.accentGradient}
                style={styles.undoButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.undoButtonText}>Geri Al</Text>
              </LinearGradient>
            </TouchableOpacity>
          </RNAnimated.View>
        )}

        {/* Modals */}
        <CopyPlanModal
          visible={isCopyModalVisible}
          onClose={() => setIsCopyModalVisible(false)}
          sourceTasks={currentTasks}
          sourceDate={formatDateDisplay(selectedDate)}
          onCopy={handleCopyPlan}
        />
        <ShareModal
          visible={isShareModalVisible}
          onClose={() => setIsShareModalVisible(false)}
          onWhatsApp={shareViaWhatsApp}
          onCopy={copyToClipboard}
        />
        <ConfirmDeleteModal
          visible={isDeleteModalVisible}
          onClose={() => setIsDeleteModalVisible(false)}
          onConfirm={confirmDelete}
          title="Tüm Planları Sil"
          message={`${formatDateDisplay(selectedDate)} tarihindeki tüm görevleri silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.`}
        />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  dateNavigation: {
    padding: 16,
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
  },
  emptyStateCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyStateIcon: {
    fontSize: 72,
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  undoSnackbar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  undoText: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  undoButtonGradient: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  undoButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  dateNavWithSearch: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  searchToggle: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchToggleIcon: {
    fontSize: 18,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginTop: 10,
    borderWidth: 1,
  },
  searchBarIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 42,
    fontSize: 15,
  },
  searchClear: {
    fontSize: 18,
    padding: 4,
  },
  searchResults: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: 1,
    maxHeight: 250,
    overflow: 'hidden',
  },
  searchNoResult: {
    padding: 20,
    textAlign: 'center',
    fontSize: 14,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  searchResultTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  searchResultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 3,
  },
  searchResultDate: {
    fontSize: 11,
  },
  searchResultCat: {
    fontSize: 11,
    fontWeight: '600',
  },
  searchResultArrow: {
    fontSize: 24,
    marginLeft: 8,
  },
  filterToggle: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  filterToggleIcon: {
    fontSize: 16,
  },
  catFilterRow: {
    gap: 8,
    paddingVertical: 10,
  },
  catFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 2,
    gap: 4,
  },
  catFilterEmoji: {
    fontSize: 13,
  },
  catFilterLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
});
