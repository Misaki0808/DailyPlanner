import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Alert,
} from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import { Task } from '../types';
import { useApp } from '../context/AppContext';
import TaskEditModal from './TaskEditModal';
import { sharedStyles } from '../utils/sharedStyles';
import { getCategoryEmoji, getCategoryLabel, getCategoryColor } from '../utils/categories';

interface AnimatedTaskItemProps {
  task: Task;
  index: number;
  totalCount?: number;
  isEditMode: boolean;
  onToggleDone: () => void;
  onChangePriority: () => void;
  onRemove: () => void;
  onNoteEdit?: (taskId: string, note: string | undefined, title?: string, category?: string) => void;
}

export default function AnimatedTaskItem({
  task,
  index,
  totalCount = 0,
  isEditMode,
  onToggleDone,
  onChangePriority,
  onRemove,
  onNoteEdit,
}: AnimatedTaskItemProps) {
  const { settings, theme } = useApp();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const swipeableRef = useRef<Swipeable>(null);

  useEffect(() => {
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.8);

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 40,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start();
  }, [task.id]);

  const priorityColor =
    task.priority === 'high' ? theme.priorityHigh :
      task.priority === 'medium' ? theme.priorityMedium :
        theme.priorityLow;

  const cardBackgroundColor = theme.taskCardBackground;
  const textColor = theme.text;
  const doneTextColor = theme.textMuted;

  const triggerRemoveAnimation = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove();
    });
  };

  // Sola kaydır -> Sil (kirmizi, dinamik scale)
  const renderRightActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'clamp',
    });
    const opacity = dragX.interpolate({
      inputRange: [-80, -30, 0],
      outputRange: [1, 0.6, 0],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.swipeActionRight}
        onPress={() => {
          swipeableRef.current?.close();
          triggerRemoveAnimation();
        }}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.swipeActionInner, { transform: [{ scale }], opacity }]}>
          <LinearGradient
            colors={['#ff6b6b', '#ee5a24']}
            style={styles.swipeActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.swipeActionIcon}>🗑</Text>
            <Text style={styles.swipeActionText}>Sil</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Saga kaydir -> Tamamla/Geri Al (yesil, dinamik scale)
  const renderLeftActions = (progress: Animated.AnimatedInterpolation<number>, dragX: Animated.AnimatedInterpolation<number>) => {
    const scale = dragX.interpolate({
      inputRange: [0, 50, 100],
      outputRange: [0, 0.8, 1],
      extrapolate: 'clamp',
    });
    const opacity = dragX.interpolate({
      inputRange: [0, 30, 80],
      outputRange: [0, 0.6, 1],
      extrapolate: 'clamp',
    });
    return (
      <TouchableOpacity
        style={styles.swipeActionLeft}
        onPress={() => {
          swipeableRef.current?.close();
          onToggleDone();
        }}
        activeOpacity={0.8}
      >
        <Animated.View style={[styles.swipeActionInner, { transform: [{ scale }], opacity }]}>
          <LinearGradient
            colors={task.done ? ['#FFC107', '#FF9800'] : ['#00b894', '#00cec9']}
            style={styles.swipeActionGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.swipeActionIcon}>{task.done ? '↩️' : '✓'}</Text>
            <Text style={styles.swipeActionText}>{task.done ? 'Geri Al' : 'Tamamla'}</Text>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // Swipe threshold aşıldığında otomatik aksiyon
  const handleSwipeOpen = (direction: 'left' | 'right') => {
    if (direction === 'right') {
      // Sola kaydırıldı → sil
      setTimeout(() => {
        swipeableRef.current?.close();
        triggerRemoveAnimation();
      }, 200);
    } else if (direction === 'left') {
      // Sağa kaydırıldı → tamamla
      setTimeout(() => {
        swipeableRef.current?.close();
        onToggleDone();
      }, 200);
    }
  };

  const taskContent = (
    <View style={[
      sharedStyles.taskCard,
      {
        borderLeftWidth: 4,
        borderLeftColor: priorityColor,
        backgroundColor: cardBackgroundColor,
      }
    ]}>
      <TouchableOpacity
        style={styles.taskItem}
        onPress={() => {}}
        activeOpacity={0.7}
      >
        {/* Görev Numarası ve Başlığı */}
        <View style={styles.taskContent}>
          <TouchableOpacity
            style={[styles.taskNumberBadge, { backgroundColor: priorityColor }]}
            onPress={onChangePriority}
            disabled={!isEditMode}
          >
            <Text style={styles.taskNumber}>{index + 1}</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={[
              styles.taskTitle,
              { color: textColor },
              task.done && { textDecorationLine: 'line-through', color: doneTextColor }
            ]}>
              {task.title}
            </Text>
            {task.category && (
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(task.category) + '25' }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(task.category) }]}>
                  {getCategoryEmoji(task.category)} {getCategoryLabel(task.category)}
                </Text>
              </View>
            )}
          </View>

          {/* Düzenle İkonu (Edit Mode) */}
          {isEditMode && (
            <TouchableOpacity
              style={styles.noteIconContainer}
              onPress={() => setShowNoteModal(true)}
            >
              <Text style={styles.noteIcon}>✏️</Text>
            </TouchableOpacity>
          )}

          {/* Not göster (normal mod) */}
          {!isEditMode && task.note && (
            <TouchableOpacity
              style={styles.noteIconContainer}
              onPress={() => setShowNoteModal(true)}
            >
              <Text style={styles.noteIcon}>📝</Text>
            </TouchableOpacity>
          )}

          {/* Silme Butonu (Edit Mode) */}
          {isEditMode && (
            <TouchableOpacity
              onPress={triggerRemoveAnimation}
              style={styles.removeButton}
            >
              <Text style={styles.removeButtonText}>🗑</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <Animated.View
        style={[
          styles.taskItemWrapper,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {isEditMode ? (
          taskContent
        ) : (
          <Swipeable
            ref={swipeableRef}
            renderLeftActions={renderLeftActions}
            renderRightActions={renderRightActions}
            onSwipeableOpen={handleSwipeOpen}
            overshootLeft={false}
            overshootRight={false}
            containerStyle={{ overflow: 'visible' }}
          >
            {taskContent}
          </Swipeable>
        )}
      </Animated.View>

      {/* Görev Düzenleme Modalı */}
      <TaskEditModal
        visible={showNoteModal}
        task={task}
        onSave={(updates) => {
          if (onNoteEdit) {
            // Pass all updates through onNoteEdit which we'll enhance
            onNoteEdit(task.id, updates.note, updates.title, updates.category);
          }
        }}
        onClose={() => setShowNoteModal(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  taskItemWrapper: {
    marginBottom: 12,
  },

  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ddd',
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    borderColor: '#4facfe',
  },
  checkboxGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskNumber: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 100, 100, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  removeButtonText: {
    fontSize: 18,
  },
  // Swipe action styles
  swipeActionRight: {
    justifyContent: 'center',
    marginBottom: 12,
  },
  swipeActionLeft: {
    justifyContent: 'center',
    marginBottom: 12,
  },
  swipeActionInner: {
    flex: 1,
    justifyContent: 'center',
  },
  swipeActionGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    borderRadius: 16,
    minWidth: 90,
    flexDirection: 'column',
    gap: 4,
  },
  swipeActionIcon: {
    fontSize: 24,
  },
  swipeActionText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 4,
  },
  noteIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  noteIcon: {
    fontSize: 16,
  },
  editActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 4,
  },
  reorderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
