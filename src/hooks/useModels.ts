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

export interface ModelsResult {
  bodies: Record<string, string[]>;   // модель → список поколений
  counts: Record<string, number>;     // модель → кол-во товаров
}

// Возвращает поколения из БД + статические известные, и счётчики товаров по моделям
export function useModels(categoryId?: string): ModelsResult {
  const [result, setResult] = useState<ModelsResult>({
    bodies: KNOWN_BODIES,
    counts: {},
  });

  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryId) params.set('category', categoryId);
    fetch(`/api/models?${params}`)
      .then(r => r.json())
      .then((rows: ModelBodyRow[]) => {
        const bodies: Record<string, string[]> = {};
        const counts: Record<string, number> = {};

        // Начинаем с известных поколений
        for (const [model, bs] of Object.entries(KNOWN_BODIES)) {
          bodies[model] = [...bs];
        }
        // Добавляем из БД и считаем товары
        for (const row of rows) {
          if (!bodies[row.model]) bodies[row.model] = [];
          if (!bodies[row.model].includes(row.body)) bodies[row.model].push(row.body);
          counts[row.model] = (counts[row.model] || 0) + row.count;
        }
        for (const key of Object.keys(bodies)) bodies[key].sort();
        setResult({ bodies, counts });
      })
      .catch(() => setResult({ bodies: KNOWN_BODIES, counts: {} }));
  }, [categoryId]);

  return result;
}
