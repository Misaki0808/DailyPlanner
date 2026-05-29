import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { Task, Subtask } from '../types';
import { TASK_CATEGORIES, getCategoryById } from '../utils/categories';
import { generateId } from '../utils/dateUtils';

interface TaskEditModalProps {
    visible: boolean;
    task: Task;
    onSave: (updates: { title?: string; note?: string; category?: string; subtasks?: Subtask[] }) => void;
    onClose: () => void;
}

export default function TaskEditModal({
    visible,
    task,
    onSave,
    onClose,
}: TaskEditModalProps) {
    const { theme } = useApp();
    const [titleText, setTitleText] = useState(task.title);
    const [noteText, setNoteText] = useState(task.note || '');
    const [selectedCategory, setSelectedCategory] = useState(task.category || 'diger');
    const [subtasks, setSubtasks] = useState<Subtask[]>(task.subtasks || []);
    const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

    useEffect(() => {
        if (visible) {
            setTitleText(task.title);
            setNoteText(task.note || '');
            setSelectedCategory(task.category || 'diger');
            setSubtasks(task.subtasks || []);
            setNewSubtaskTitle('');
        }
    }, [visible, task]);

    const handleAddSubtask = () => {
        if (!newSubtaskTitle.trim()) return;
        setSubtasks([...subtasks, { id: generateId(), title: newSubtaskTitle.trim(), done: false }]);
        setNewSubtaskTitle('');
    };

    const handleRemoveSubtask = (id: string) => {
        setSubtasks(subtasks.filter(s => s.id !== id));
    };

    const handleToggleSubtask = (id: string) => {
        setSubtasks(subtasks.map(s => s.id === id ? { ...s, done: !s.done } : s));
    };

    const handleSave = () => {
        onSave({
            title: titleText.trim() || task.title,
            note: noteText.trim() || undefined,
            category: selectedCategory,
            subtasks,
        });
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <KeyboardAvoidingView
                style={styles.overlay}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <View style={[styles.container, { backgroundColor: theme.modalBackground, borderColor: theme.border }]}>
                    <Text style={[styles.title, { color: theme.text }]}>✏️ Görevi Düzenle</Text>

                    {/* Başlık */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Başlık</Text>
                    <TextInput
                        style={[styles.input, { backgroundColor: theme.accentLight, color: theme.text, borderColor: theme.border }]}
                        value={titleText}
                        onChangeText={setTitleText}
                        placeholder="Görev başlığı..."
                        placeholderTextColor={theme.textMuted}
                        autoFocus
                    />

                    {/* Not */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Not</Text>
                    <TextInput
                        style={[styles.input, styles.noteInput, { backgroundColor: theme.accentLight, color: theme.text, borderColor: theme.border }]}
                        value={noteText}
                        onChangeText={setNoteText}
                        placeholder="Not ekle (opsiyonel)..."
                        placeholderTextColor={theme.textMuted}
                        multiline
                        numberOfLines={3}
                        textAlignVertical="top"
                    />

                    {/* Kategori */}
                    <Text style={[styles.label, { color: theme.textSecondary }]}>Kategori</Text>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    >
                        {TASK_CATEGORIES.map((cat) => {
                            const isSelected = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[
                                        styles.categoryChip,
                                        { backgroundColor: isSelected ? cat.color + '30' : theme.accentLight },
                                        isSelected && { borderColor: cat.color, borderWidth: 2 },
                                    ]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
                                    <Text style={[
                                        styles.categoryChipText,
                                        { color: isSelected ? cat.color : theme.textSecondary },
                                    ]}>
                                        {cat.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </ScrollView>

                    {/* Alt Görevler */}
                    <Text style={[styles.label, { color: theme.textSecondary, marginTop: 12 }]}>Alt Görevler</Text>
                    <View style={styles.subtaskList}>
                        {subtasks.map((st) => (
                            <View key={st.id} style={[styles.subtaskItem, { backgroundColor: theme.taskCardBackground, borderColor: theme.border }]}>
                                <TouchableOpacity onPress={() => handleToggleSubtask(st.id)}>
                                    <Text style={styles.subtaskCheck}>{st.done ? '✅' : '⬜'}</Text>
                                </TouchableOpacity>
                                <Text style={[styles.subtaskTitle, { color: st.done ? theme.textMuted : theme.text }, st.done && styles.subtaskDoneText]}>
                                    {st.title}
                                </Text>
                                <TouchableOpacity onPress={() => handleRemoveSubtask(st.id)}>
                                    <Text style={styles.subtaskRemove}>🗑️</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                    <View style={styles.subtaskAddRow}>
                        <TextInput
                            style={[styles.input, styles.subtaskInput, { backgroundColor: theme.accentLight, color: theme.text, borderColor: theme.border }]}
                            value={newSubtaskTitle}
                            onChangeText={setNewSubtaskTitle}
                            placeholder="Yeni alt görev..."
                            placeholderTextColor={theme.textMuted}
                            onSubmitEditing={handleAddSubtask}
                        />
                        <TouchableOpacity style={[styles.subtaskAddBtn, { backgroundColor: theme.accent }]} onPress={handleAddSubtask}>
                            <Text style={styles.subtaskAddBtnText}>Ekle</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Aksiyonlar */}
                    <View style={styles.actions}>
                        <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                            <Text style={[styles.cancelBtnText, { color: theme.textSecondary }]}>İptal</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                            <LinearGradient
                                colors={theme.accentGradient}
                                style={styles.saveBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.saveBtnText}>Kaydet</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 16,
    },
    label: {
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 6,
        marginTop: 4,
    },
    input: {
        borderRadius: 14,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 15,
        borderWidth: 1,
        marginBottom: 12,
    },
    noteInput: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    categoryScroll: {
        gap: 8,
        paddingBottom: 12,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: 'transparent',
        gap: 4,
    },
    categoryEmoji: {
        fontSize: 14,
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        marginTop: 8,
        gap: 10,
    },
    cancelBtn: {
        paddingVertical: 10,
        paddingHorizontal: 16,
    },
    cancelBtnText: {
        fontSize: 14,
        fontWeight: '600',
    },
    saveBtn: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    saveBtnGradient: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
    },
    saveBtnText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    subtaskList: {
        maxHeight: 120,
        marginBottom: 8,
    },
    subtaskItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        marginBottom: 6,
    },
    subtaskCheck: {
        fontSize: 16,
        marginRight: 8,
    },
    subtaskTitle: {
        flex: 1,
        fontSize: 14,
    },
    subtaskDoneText: {
        textDecorationLine: 'line-through',
    },
    subtaskRemove: {
        fontSize: 16,
        paddingLeft: 8,
    },
    subtaskAddRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    subtaskInput: {
        flex: 1,
        marginBottom: 0,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
    },
    subtaskAddBtn: {
        paddingHorizontal: 16,
        paddingVertical: 13,
        borderTopRightRadius: 14,
        borderBottomRightRadius: 14,
        justifyContent: 'center',
    },
    subtaskAddBtnText: {
        color: '#fff',
        fontWeight: 'bold',
    },
});
