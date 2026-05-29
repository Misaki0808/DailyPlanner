import { StyleSheet, Dimensions } from 'react-native';
const { width, height } = Dimensions.get('window');

export const styles = StyleSheet.create({
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
  filterBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
  },
  filterBannerTitle: {
    fontWeight: '700',
    fontSize: 14,
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
