import { Plans } from '../types';
import { getCategoryLabel } from './categories';

/**
 * Excel, BOM'suz UTF-8 CSV'yi yerel Windows kod sayfasıyla açar ve Türkçe
 * karakterler bozulur ("Sağlık" -> "SaÄŸlÄ±k"). Dosya "Excel (CSV) olarak
 * aktar" düğmesiyle üretildiği için BOM zorunlu.
 */
export const UTF8_BOM = '﻿';

const CSV_HEADER = 'Tarih,Gorev Basligi,Oncelik,Kategori,Durum,Not';

/**
 * Bir alanı CSV için güvenli hâle getirir: tırnaklar ikilenir ve alan
 * tırnak içine alınır. Böylece başlıktaki virgül, tırnak veya satır sonu
 * satır yapısını bozamaz.
 */
const csvField = (value: string): string => `"${value.replace(/"/g, '""')}"`;

/**
 * Planları Excel'in okuyabileceği CSV metnine çevirir.
 * Günler en yeniden eskiye sıralanır.
 */
export const buildPlansCsv = (plans: Plans): string => {
  const rows: string[] = [CSV_HEADER];

  const dates = Object.keys(plans).sort((a, b) => b.localeCompare(a));

  for (const date of dates) {
    for (const task of plans[date] || []) {
      rows.push([
        date,
        csvField(task.title || ''),
        task.priority || 'low',
        csvField(getCategoryLabel(task.category || 'diger')),
        task.done ? 'Tamamlandi' : 'Bekliyor',
        csvField(task.note || ''),
      ].join(','));
    }
  }

  return `${UTF8_BOM}${rows.join('\n')}\n`;
};
