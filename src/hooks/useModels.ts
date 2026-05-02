import { useState, useEffect } from 'react';

interface ModelBodyRow {
  model: string;
  body: string;
  count: number;
}

// Известные поколения — показываются всегда, даже если в базе нет товаров
const KNOWN_BODIES: Record<string, string[]> = {
  '1': ['E87', 'F20', 'F40'],
  '2': ['F22', 'F45', 'F46', 'G42', 'F87'],
  '3': ['E46', 'E90', 'F30', 'G20'],
  '4': ['F32', 'F36', 'G22'],
  '5': ['E60', 'F10', 'G30'],
  '6': ['E63', 'F12', 'F13'],
  '7': ['E65', 'F01', 'G11', 'G12'],
  '8': ['G14', 'G15'],
  'X1': ['E84', 'F48', 'U11'],
  'X2': ['F39', 'U10'],
  'X3': ['E83', 'F25', 'G01'],
  'X4': ['F26', 'G02'],
  'X5': ['E53', 'E70', 'F15', 'G05'],
  'X6': ['E71', 'F16', 'G06'],
  'X7': ['G07'],
  'M2': ['F87', 'G87'],
  'M3': ['E46', 'E90', 'F80', 'G80'],
  'M4': ['F82', 'G82'],
  'M5': ['E60', 'F10', 'F90'],
  'M8': ['F91', 'F92'],
  'Z4': ['E85', 'E89', 'G29'],
};

// Возвращает поколения из БД + статические известные, объединённые и отсортированные
export function useModels(categoryId?: string): Record<string, string[]> {
  const [result, setResult] = useState<Record<string, string[]>>(KNOWN_BODIES);

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set('category', categoryId);
    fetch(`/api/models?${params}`)
      .then(r => r.json())
      .then((rows: ModelBodyRow[]) => {
        // Начинаем с известных поколений, добавляем из БД если их нет
        const map: Record<string, string[]> = {};
        for (const [model, bodies] of Object.entries(KNOWN_BODIES)) {
          map[model] = [...bodies];
        }
        for (const row of rows) {
          if (!map[row.model]) map[row.model] = [];
          if (!map[row.model].includes(row.body)) map[row.model].push(row.body);
        }
        // Сортируем поколения внутри каждой модели
        for (const key of Object.keys(map)) map[key].sort();
        setResult(map);
      })
      .catch(() => setResult(KNOWN_BODIES));
  }, [categoryId]);

  return result;
}
