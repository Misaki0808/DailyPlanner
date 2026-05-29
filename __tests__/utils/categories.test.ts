import { getCategoryById, getCategoryColor, getCategoryEmoji, getCategoryLabel, TASK_CATEGORIES } from '../../src/utils/categories';

describe('categories utility', () => {
  it('should return correct category by id', () => {
    const isCategory = getCategoryById('is');
    expect(isCategory.label).toBe('İş');
    expect(isCategory.id).toBe('is');
  });

  it('should return "diger" category as fallback if id is not found', () => {
    const unknownCategory = getCategoryById('unknown_id_123');
    expect(unknownCategory.id).toBe('diger');
    expect(unknownCategory.label).toBe('Diğer');
  });

  it('should return correct color by id', () => {
    const color = getCategoryColor('spor');
    const sporCategory = TASK_CATEGORIES.find(c => c.id === 'spor');
    expect(color).toBe(sporCategory?.color);
  });

  it('should return default color if id is not provided or invalid', () => {
    const color = getCategoryColor();
    const defaultColor = TASK_CATEGORIES.find(c => c.id === 'diger')?.color;
    expect(color).toBe(defaultColor);

    const invalidColor = getCategoryColor('invalid');
    expect(invalidColor).toBe(defaultColor);
  });

  it('should return correct emoji by id', () => {
    const emoji = getCategoryEmoji('saglik');
    expect(emoji).toBe('❤️');
  });

  it('should return default emoji if id is not provided', () => {
    const emoji = getCategoryEmoji();
    expect(emoji).toBe('📁');
  });

  it('should return correct label by id', () => {
    const label = getCategoryLabel('okul');
    expect(label).toBe('Okul');
  });

  it('should return default label if id is not provided', () => {
    const label = getCategoryLabel();
    expect(label).toBe('Diğer');
  });
});
