/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { AppData, UserSettings, AlcoholRecord, WeightRecord, BloodTestRecord } from '../types';

const STORAGE_KEY = 'alcohol_health_app_data';
const GAS_URL = import.meta.env.VITE_GAS_URL;

const DEFAULT_DATA: AppData = {
  settings: {
    name: 'ゲスト',
    dailyGoalDrinks: 2,
  },
  alcoholRecords: [],
  weightRecords: [],
  bloodTestRecords: [],
};

export const storageService = {
  async getData(): Promise<AppData> {
    if (!GAS_URL) {
      const json = localStorage.getItem(STORAGE_KEY);
      if (!json) return DEFAULT_DATA;
      try {
        return JSON.parse(json);
      } catch (e) {
        console.error('Failed to parse local app data', e);
        return DEFAULT_DATA;
      }
    }

    try {
      const response = await fetch(GAS_URL);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      return {
        ...DEFAULT_DATA,
        ...data,
        alcoholRecords: data.alcoholRecords || [],
        weightRecords: data.weightRecords || [],
        bloodTestRecords: data.bloodTestRecords || [],
      };
    } catch (e) {
      console.error('Failed to fetch from GAS', e);
      // Fallback to local storage if GAS fails
      const json = localStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : DEFAULT_DATA;
    }
  },

  async saveData(data: AppData) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    // We don't save everything at once to GAS anymore, we do incremental saves via methods below
  },

  async updateSettings(settings: UserSettings) {
    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ type: 'settings', ...settings }),
        });
      } catch (e) {
        console.error('Failed to update settings in GAS', e);
      }
    }
    const json = localStorage.getItem(STORAGE_KEY);
    const data = json ? JSON.parse(json) : DEFAULT_DATA;
    data.settings = settings;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  },

  async addAlcoholRecord(record: Omit<AlcoholRecord, 'id'>) {
    const newRecord: AlcoholRecord = {
      ...record,
      id: crypto.randomUUID(),
    };

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ type: 'alcohol', ...newRecord }),
        });
      } catch (e) {
        console.error('Failed to add alcohol to GAS', e);
      }
    }

    const json = localStorage.getItem(STORAGE_KEY);
    const data = json ? JSON.parse(json) : DEFAULT_DATA;
    data.alcoholRecords.push(newRecord);
    data.alcoholRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newRecord;
  },

  async addWeightRecord(record: Omit<WeightRecord, 'id'>) {
    const newRecord: WeightRecord = {
      ...record,
      id: crypto.randomUUID(),
    };

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ type: 'weight', ...newRecord }),
        });
      } catch (e) {
        console.error('Failed to add weight to GAS', e);
      }
    }

    const json = localStorage.getItem(STORAGE_KEY);
    const data = json ? JSON.parse(json) : DEFAULT_DATA;
    data.weightRecords.push(newRecord);
    data.weightRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newRecord;
  },

  async addBloodTestRecord(record: Omit<BloodTestRecord, 'id'>) {
    const newRecord: BloodTestRecord = {
      ...record,
      id: crypto.randomUUID(),
    };

    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ type: 'blood', ...newRecord }),
        });
      } catch (e) {
        console.error('Failed to add blood result to GAS', e);
      }
    }

    const json = localStorage.getItem(STORAGE_KEY);
    const data = json ? JSON.parse(json) : DEFAULT_DATA;
    data.bloodTestRecords.push(newRecord);
    data.bloodTestRecords.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return newRecord;
  },

  async deleteRecord(type: 'alcohol' | 'weight' | 'blood', id: string) {
    if (GAS_URL) {
      try {
        await fetch(GAS_URL, {
          method: 'POST',
          body: JSON.stringify({ type: type === 'alcohol' ? 'alcohol' : type === 'weight' ? 'weight' : 'blood', id, action: 'delete' }),
        });
      } catch (e) {
        console.error('Failed to delete record in GAS', e);
      }
    }

    const json = localStorage.getItem(STORAGE_KEY);
    const data = json ? JSON.parse(json) : DEFAULT_DATA;
    if (type === 'alcohol') {
      data.alcoholRecords = data.alcoholRecords.filter((r: any) => r.id !== id);
    } else if (type === 'weight') {
      data.weightRecords = data.weightRecords.filter((r: any) => r.id !== id);
    } else if (type === 'blood') {
      data.bloodTestRecords = data.bloodTestRecords.filter((r: any) => r.id !== id);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
};
