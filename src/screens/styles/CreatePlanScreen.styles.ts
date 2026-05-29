import { StyleSheet, Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  dateSection: {
    marginBottom: 20,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  dateButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dateGradient: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  changeDateBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  changeDateText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  aiSection: {
    marginBottom: 20,
  },
  paragraphInput: {
    fontSize: 16,
    minHeight: 100,
  },
  inputActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    fontSize: 18,
    fontWeight: '700',
  },
  inputSection: {
    marginBottom: 20,
  },
  prioritySelector: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  priorityButtonActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  priorityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  priorityEmoji: {
    fontSize: 14,
  },
  priorityText: {
    fontSize: 13,
    fontWeight: '700',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  input: {
    fontSize: 16,
    flex: 1,
  },
  addButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  addButtonGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '600',
  },
  taskListSection: {
    marginBottom: 20,
  },
  taskItem: {
    marginBottom: 12,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  taskNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  taskTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  saveButton: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  saveButtonGradient: {
    padding: 20,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  taskNoteHint: {
    fontSize: 11,
    marginTop: 2,
    fontStyle: 'italic',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: 4,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
});
