/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface UserSettings {
  name: string;
  dailyGoalDrinks: number;
}

export interface AlcoholRecord {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  name: string;
  price: number;
  volume: number; // ml
  abv: number; // percentage
  drinks: number; // calculated
}

export interface WeightRecord {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  weight: number; // kg
}

export interface BloodTestRecord {
  id: string;
  date: string; // ISO string YYYY-MM-DD
  gammaGTP: number;
  ast: number;
  alt: number;
  triglycerides: number;
}

export interface AppData {
  settings: UserSettings;
  alcoholRecords: AlcoholRecord[];
  weightRecords: WeightRecord[];
  bloodTestRecords: BloodTestRecord[];
}
