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
  Keyboard,
} from 'react-native';
import Toast from 'react-native-toast-message';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import ConfettiCannon from 'react-native-confetti-cannon';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlansContext, useSettingsContext, useRecurringContext } from '../context/AppContext';
import { useNavigation } from '@react-navigation/native';
import { formatDateDisplay, getToday, addDays, generateId } from '../utils/dateUtils';
import { Task } from '../types';
import CopyPlanModal from '../components/CopyPlanModal';
import ShareModal from '../components/ShareModal';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import AnimatedTaskItem from '../components/AnimatedTaskItem';
import DateNavigation from '../components/planner/DateNavigation';
import MonthlyCalendarModal from '../components/planner/MonthlyCalendarModal';
import FlexibleTaskPool from '../components/planner/FlexibleTaskPool';
import ActionButtonsBar from '../components/planner/ActionButtonsBar';
import DayStatsBar from '../components/planner/DayStatsBar';
import SearchFilterModal from '../components/planner/SearchFilterModal';
import { getCategoryEmoji, getCategoryLabel, getCategoryColor } from '../utils/categories';
import { HeaderProgressBar } from '../components/HeaderProgressBar';

// Sadece native platformlarda import et
let RNShare: any = null;
if (Platform.OS !== 'web') {
  try {
    RNShare = require('react-native-share').default;
  } catch (e) {
    // react-native-share not available on web
  }
}

import { styles } from './styles/MultiDayViewScreen.styles';

export default function MultiDayViewScreen() {
  const { plans, updateTask, savePlan, deletePlan } = usePlansContext();
  const { settings, theme } = useSettingsContext();
  const { recurringTasks } = useRecurringContext();
  const [selectedDate, setSelectedDate] = useState(getToday());
  const [currentTasks, setCurrentTasks] = useState<Task[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isCopyModalVisible, setIsCopyModalVisible] = useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [deletedTask, setDeletedTask] = useState<Task | null>(null);
  const [quickAddText, setQuickAddText] = useState('');
  const [showConfetti, setShowConfetti] = useState(false);
  const undoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const undoAnim = useRef(new RNAnimated.Value(0)).current;
  const [isCalendarVisible, setIsCalendarVisible] = useState(false);
  const [isSearchFilterOpen, setIsSearchFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilterCats, setSelectedFilterCats] = useState<string[]>([]);
  
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <HeaderProgressBar />
          <TouchableOpacity style={{ padding: 8, marginRight: 12 }} onPress={() => setIsSearchFilterOpen(true)} activeOpacity={0.7}>
            <Text style={{ fontSize: 20 }}>🔍</Text>
          </TouchableOpacity>
        </View>
      )
    });
  }, [navigation]);

  const isFiltering = searchQuery.trim().length > 0 || selectedFilterCats.length > 0;

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
  const toggleTaskDone = async (taskId: string, currentStatus: boolean) => {
    const updatedTasks = currentTasks.map(task =>
      task.id === taskId ? { ...task, done: !currentStatus } : task
    );
    await savePlan(selectedDate, updatedTasks);
    
    if (!currentStatus) {
      setShowConfetti(false);
      setTimeout(() => setShowConfetti(true), 50);
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
      id: generateId(),
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
      id: generateId(),
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
  const handleNoteEdit = async (taskId: string, note: string | undefined, title?: string, category?: string, subtasks?: any[]) => {
    const updatedTasks = currentTasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          note,
          ...(title ? { title } : {}),
          ...(category ? { category } : {}),
          ...(subtasks ? { subtasks } : {}),
        };
      }
      return task;
    });
    await savePlan(selectedDate, updatedTasks);
  };

  // Alt görev toggle
  const handleToggleSubtask = async (taskId: string, subtaskId: string) => {
    const updatedTasks = currentTasks.map(task => {
      if (task.id === taskId && task.subtasks) {
        return {
          ...task,
          subtasks: task.subtasks.map(st => st.id === subtaskId ? { ...st, done: !st.done } : st)
        };
      }
      return task;
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
      const titleLower = rt.title.toLocaleLowerCase('tr-TR');
      weekDates.forEach(date => {
        const dayTasks = plans[date] || [];
        if (dayTasks.some(t => t.title.toLocaleLowerCase('tr-TR') === titleLower)) {
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
      id: generateId(),
      done: false,
    }));
    const allTasks = [...existingTasks, ...newTasks];
    await savePlan(targetDate, allTasks);

    Toast.show({ type: 'success', text1: 'Başarılı', text2: `${selectedTasks.length} görev ${targetDate} tarihine kopyalandı.` });
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
      else Toast.show({ type: 'info', text1: 'Uyarı', text2: 'Paylaşılacak görev yok' });
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
      else Toast.show({ type: 'error', text1: 'Hata', text2: 'Plan paylaşılırken hata oluştu' });
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
                onOpenCalendar={() => setIsCalendarVisible(true)}
              />
            </View>
          </View>

          {isFiltering && (
            <View style={[styles.filterBanner, { backgroundColor: theme.accentLight, borderColor: theme.accent }]}>
              <Text style={[styles.filterBannerTitle, { color: theme.accent }]}>🔍 Filtreler Aktif</Text>
              <TouchableOpacity onPress={() => { setSearchQuery(''); setSelectedFilterCats([]); }}>
                <Text style={{ color: theme.accent, fontWeight: '700' }}>Temizle ✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Arama Sonuçları */}
          {isFiltering && (() => {
            const query = searchQuery.toLocaleLowerCase('tr-TR').trim();
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
                const catLabel = getCategoryLabel(task.category).toLocaleLowerCase('tr-TR');
                if (
                  task.title.toLocaleLowerCase('tr-TR').includes(query) ||
                  task.note?.toLocaleLowerCase('tr-TR').includes(query) ||
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
                      setSearchQuery('');
                      setSelectedFilterCats([]);
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.searchResultTitle, { color: theme.text }]}>
                        {r.task.done ? '✅ ' : '⬜ '}{r.task.title}
                      </Text>
                      <View style={styles.searchResultMeta}>
                        <Text style={[styles.searchResultDate, { color: theme.textSecondary }]}>
                          📅 {formatDateDisplay(r.date)}
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
          {!isFiltering && (
            <FlexibleTaskPool
              flexibleProgress={flexibleProgress}
              onAddFlexibleTask={handleAddFlexibleTask}
            />
          )}

          {/* Buton Grubu */}
          {!isFiltering && totalCount > 0 && (
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
        {!isFiltering && (
          <DayStatsBar
            completedCount={completedCount}
            totalCount={totalCount}
            percentage={percentage}
            allCompleted={allCompleted}
          />
        )}

        {/* Görev Listesi */}
        {/* Görev Listesi */}
        {!isFiltering && (
          <DraggableFlatList
            style={styles.taskList}
            data={currentTasks}
            onDragEnd={({ data }) => savePlan(selectedDate, data)}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={() => (
              <View style={styles.emptyState}>
                <View style={[styles.emptyStateCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Text style={styles.emptyStateIcon}>📭</Text>
                  <Text style={[styles.emptyStateTitle, { color: theme.text }]}>Bu gün için plan yok</Text>
                  <Text style={[styles.emptyStateSubtitle, { color: theme.textSecondary }]}>
                    "Plan Oluştur" sekmesinden yeni plan ekleyebilirsiniz
                  </Text>
                </View>
              </View>
            )}
            renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<Task>) => (
              <View style={[isActive && { transform: [{ scale: 1.05 }], zIndex: 99, elevation: 5, shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 4 } }]}>
                <AnimatedTaskItem
                  task={item}
                  index={getIndex() || 0}
                  totalCount={currentTasks.length}
                  isEditMode={isEditMode}
                  onToggleDone={() => toggleTaskDone(item.id, item.done)}
                  onChangePriority={() => handleChangePriority(item.id)}
                  onRemove={() => handleRemoveTask(item.id)}
                  onNoteEdit={handleNoteEdit}
                  onToggleSubtask={(subtaskId) => handleToggleSubtask(item.id, subtaskId)}
                />
                {isEditMode && (
                  <TouchableOpacity
                    onLongPress={drag}
                    style={{
                      position: 'absolute',
                      right: 50,
                      top: 15,
                      padding: 10,
                      zIndex: 100,
                    }}
                  >
                    <Text style={{ fontSize: 20 }}>☰</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            contentContainerStyle={currentTasks.length === 0 ? { flex: 1 } : undefined}
          />
        )}

        {/* Konfeti Animasyonu */}
        {showConfetti && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <ConfettiCannon 
              count={100} 
              origin={{x: -10, y: 0}}
              autoStart={true}
              fadeOut={true}
              onAnimationEnd={() => setShowConfetti(false)}
            />
          </View>
        )}

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
        <MonthlyCalendarModal
          visible={isCalendarVisible}
          onClose={() => setIsCalendarVisible(false)}
          selectedDate={selectedDate}
          onSelectDate={(newDate) => { setSelectedDate(newDate); setIsCalendarVisible(false); }}
        />
        <ShareModal
          visible={isShareModalVisible}
          onClose={() => setIsShareModalVisible(false)}
          onWhatsApp={shareViaWhatsApp}
          onCopy={copyToClipboard}
        />
        <SearchFilterModal
          visible={isSearchFilterOpen}
          onClose={() => setIsSearchFilterOpen(false)}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          selectedFilterCats={selectedFilterCats}
          setSelectedFilterCats={setSelectedFilterCats}
          onApply={() => setIsSearchFilterOpen(false)}
          onClear={() => { setSearchQuery(''); setSelectedFilterCats([]); }}
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


