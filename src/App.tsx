/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Beer, 
  Scale, 
  Activity, 
  Plus, 
  Trash2, 
  ChevronRight, 
  TrendingDown, 
  TrendingUp, 
  Target, 
  Calendar,
  Settings,
  AlertCircle,
  Wine,
  GlassWater,
  PlusCircle,
  History,
  LayoutDashboard
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService } from './services/storageService';
import { AlcoholRecord, WeightRecord, BloodTestRecord, AppData, UserSettings } from './types';

// Utility for calculating drinks (Japan Unit: 20g of alcohol = 1 drink)
const calculateDrinks = (volume: number, abv: number) => {
  const grams = volume * (abv / 100) * 0.8;
  return Number((grams / 20).toFixed(2));
};

// Date utilities
const getTodayDate = () => new Date().toISOString().split('T')[0];
const getMonthYear = (dateStr: string) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${d.getMonth() + 1}`;
};

// Unified row for the full history view (all record types in one list)
type HistoryItem = {
  kind: 'alcohol' | 'weight' | 'blood';
  id: string;
  date: string;
  title: string;
  detail: string;
};

const HISTORY_ICON: Record<HistoryItem['kind'], string> = {
  alcohol: '🍺',
  weight: '⚖️',
  blood: '🩸',
};

export default function App() {
  const [data, setData] = useState<AppData>({
    settings: { name: '...', dailyGoalDrinks: 2 },
    alcoholRecords: [],
    weightRecords: [],
    bloodTestRecords: []
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');
  const [inputTab, setInputTab] = useState<'alcohol' | 'weight' | 'blood'>('alcohol');
  const [showSettings, setShowSettings] = useState(false);
  const [usePriceCalc, setUsePriceCalc] = useState(false);
  const [calcBase, setCalcBase] = useState({ purchaseVolume: '', purchasePrice: '' });

  // Form states
  const [alcoholForm, setAlcoholForm] = useState({ date: getTodayDate(), name: '', price: '', volume: '', abv: '' });
  const [weightForm, setWeightForm] = useState({ date: getTodayDate(), weight: '' });
  const [bloodForm, setBloodForm] = useState({ date: getTodayDate(), gammaGTP: '', ast: '', alt: '', triglycerides: '' });
  const [settingsForm, setSettingsForm] = useState<UserSettings>(data.settings);

  // Constants for presets
  const ALCOHOL_PRESETS = [
    { label: 'ビール(ケース)', vol: 8400, abv: 5, name: 'ビール' }, // 350ml * 24
    { label: '焼酎(4L)', vol: 4000, abv: 25, name: '焼酎' },
    { label: 'ウイスキー(700ml)', vol: 700, abv: 40, name: 'ウイスキー' },
    { label: '日本酒(一升)', vol: 1800, abv: 15, name: '日本酒' },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const applyPreset = (p: typeof ALCOHOL_PRESETS[0]) => {
    setAlcoholForm({ ...alcoholForm, name: p.name, abv: p.abv.toString() });
    setCalcBase({ ...calcBase, purchaseVolume: p.vol.toString() });
    setUsePriceCalc(true);
  };

  const calculateUnitWeightPrice = () => {
    if (!calcBase.purchasePrice || !calcBase.purchaseVolume || !alcoholForm.volume) return '';
    const unitPrice = Number(calcBase.purchasePrice) / Number(calcBase.purchaseVolume);
    return Math.round(unitPrice * Number(alcoholForm.volume)).toString();
  };

  useEffect(() => {
    if (usePriceCalc) {
      const price = calculateUnitWeightPrice();
      if (price) setAlcoholForm(f => ({ ...f, price }));
    }
  }, [calcBase, alcoholForm.volume, usePriceCalc]);

  const loadData = async () => {
    setLoading(true);
    try {
      const result = await storageService.getData();
      setData(result);
    } catch (e) {
      console.error('Failed to load data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSettingsForm(data.settings);
  }, [data.settings]);

  // Statistics
  const stats = useMemo(() => {
    const today = getTodayDate();
    const currentMonth = getMonthYear(today);

    const todayDrinks = data.alcoholRecords
      .filter(r => r.date === today)
      .reduce((sum, r) => sum + r.drinks, 0);

    const monthRecords = data.alcoholRecords.filter(r => getMonthYear(r.date) === currentMonth);
    const monthDrinks = monthRecords.reduce((sum, r) => sum + r.drinks, 0);
    const monthSpent = monthRecords.reduce((sum, r) => sum + r.price, 0);

    // Goal achievement days in month
    const daysInMonth = Array.from(new Set(monthRecords.map(r => r.date)));
    const achievedDays = daysInMonth.filter(date => {
      const dayTotal = data.alcoholRecords
        .filter(r => r.date === date)
        .reduce((sum, r) => sum + r.drinks, 0);
      return dayTotal <= data.settings.dailyGoalDrinks;
    }).length;

    const latestWeight = data.weightRecords[0]?.weight || 0;
    const latestGTP = data.bloodTestRecords[0]?.gammaGTP || 0;

    return {
      todayDrinks,
      monthDrinks,
      monthSpent,
      achievedDays,
      latestWeight,
      latestGTP
    };
  }, [data]);

  const handleAddAlcohol = async (e: React.FormEvent) => {
    e.preventDefault();
    const drinks = calculateDrinks(Number(alcoholForm.volume), Number(alcoholForm.abv));
    await storageService.addAlcoholRecord({
      date: alcoholForm.date,
      name: alcoholForm.name,
      price: Number(alcoholForm.price),
      volume: Number(alcoholForm.volume),
      abv: Number(alcoholForm.abv),
      drinks
    });
    await loadData();
    setAlcoholForm({ ...alcoholForm, name: '', price: '', volume: '', abv: '' });
  };

  const handleAddWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    await storageService.addWeightRecord({
      date: weightForm.date,
      weight: Number(weightForm.weight)
    });
    await loadData();
    setWeightForm({ ...weightForm, weight: '' });
  };

  const handleAddBlood = async (e: React.FormEvent) => {
    e.preventDefault();
    await storageService.addBloodTestRecord({
      date: bloodForm.date,
      gammaGTP: Number(bloodForm.gammaGTP),
      ast: Number(bloodForm.ast),
      alt: Number(bloodForm.alt),
      triglycerides: Number(bloodForm.triglycerides)
    });
    await loadData();
    setBloodForm({ ...bloodForm, gammaGTP: '', ast: '', alt: '', triglycerides: '' });
  };

  const handleDelete = async (type: 'alcohol' | 'weight' | 'blood', id: string) => {
    if (confirm('削除してよろしいですか？')) {
      await storageService.deleteRecord(type, id);
      await loadData();
    }
  };

  const handleSaveSettings = async () => {
    await storageService.updateSettings(settingsForm);
    await loadData();
    setShowSettings(false);
  };

  // All records merged and sorted newest-first (YYYY-MM-DD compares correctly as a string)
  const allHistory = useMemo<HistoryItem[]>(() => [
    ...data.alcoholRecords.map(r => ({
      kind: 'alcohol' as const,
      id: r.id,
      date: r.date,
      title: r.name,
      detail: `${r.drinks.toFixed(1)} Unit / ¥${r.price.toLocaleString()}`,
    })),
    ...data.weightRecords.map(r => ({
      kind: 'weight' as const,
      id: r.id,
      date: r.date,
      title: '体重',
      detail: `${r.weight} kg`,
    })),
    ...data.bloodTestRecords.map(r => ({
      kind: 'blood' as const,
      id: r.id,
      date: r.date,
      title: '血液検査',
      detail: `γ-GTP ${r.gammaGTP} / AST ${r.ast} / ALT ${r.alt} / 中性脂肪 ${r.triglycerides}`,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date)), [data]);

  const isOverGoal = stats.todayDrinks > data.settings.dailyGoalDrinks;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-24">
      {loading && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Loading Data...</p>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="mx-4 mt-6 bg-white border border-slate-200 rounded-[28px] px-5 py-4 flex justify-between items-center shadow-sm sticky top-6 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-100">
            <Beer className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-black text-base tracking-tight text-slate-900">のんべえ健康管理</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Health Drinker</p>
          </div>
        </div>
        <button 
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 py-1.5 px-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all border border-slate-100"
          id="settings-btn"
        >
          <span className="text-[10px] font-black text-slate-600">{data.settings.name}</span>
          <Settings className="w-4 h-4 text-slate-400" />
        </button>
      </header>

      <main className="max-w-md mx-auto p-4 pt-6 space-y-6">
        
        {activeTab === 'history' ? (
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">すべての履歴</p>
              <button onClick={() => setActiveTab('input')} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest hover:underline">
                ← ホーム
              </button>
            </div>

            <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm space-y-3">
              {allHistory.length === 0 ? (
                <div className="py-12 text-center text-slate-300 italic text-sm">履歴がありません</div>
              ) : (
                allHistory.map(item => (
                  <div key={`${item.kind}-${item.id}`} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 shrink-0 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">{HISTORY_ICON[item.kind]}</div>
                      <div className="min-w-0">
                        <p className="text-xs font-black text-slate-800 truncate">{item.title}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-tight">{item.date.replace(/-/g, '/')}</p>
                        <p className="text-[10px] font-bold text-slate-500 tracking-tight truncate">{item.detail}</p>
                      </div>
                    </div>
                    <button onClick={() => handleDelete(item.kind, item.id)} className="p-2 shrink-0 text-slate-300 hover:text-rose-400 transition-colors" aria-label="削除">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        ) : (<>
        {/* Dashboard Section (Bento Tiles) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Dashboard</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Today's Status (Large Bento Tile) */}
            <div className={`col-span-2 p-6 rounded-[32px] bg-white border border-slate-200 shadow-sm flex flex-col justify-between transition-colors relative overflow-hidden group`}>
              <div className="relative z-10">
                <div className="flex justify-between items-start">
                  <span className={`text-[10px] font-black uppercase tracking-wider ${isOverGoal ? 'text-red-500' : 'text-slate-400'}`}>
                    今日の飲酒状況
                  </span>
                  {isOverGoal ? (
                    <div className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-[9px] font-black uppercase border border-red-100 tracking-tighter animate-pulse">
                      Danger over
                    </div>
                  ) : (
                    <div className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase border border-emerald-100 tracking-tighter">
                      Safe limit
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <h2 className={`text-4xl font-black ${isOverGoal ? 'text-red-600' : 'text-slate-900'} leading-none`}>
                    {stats.todayDrinks.toFixed(1)} <span className="text-sm font-medium text-slate-400">Unit</span>
                  </h2>
                </div>
              </div>
              
              <div className="mt-6 mb-4">
                <div className="w-full bg-slate-50 h-2.5 rounded-full overflow-hidden border border-slate-100">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((stats.todayDrinks / data.settings.dailyGoalDrinks) * 100, 100)}%` }}
                    className={`h-full ${isOverGoal ? 'bg-red-500' : 'bg-emerald-500'}`}
                  />
                </div>
                <div className="flex justify-between mt-2 text-[10px] font-black uppercase tracking-wide">
                  <span className={isOverGoal ? 'text-red-600' : 'text-emerald-600'}>
                    {isOverGoal ? '目標超過' : 'セーフゾーン'}
                  </span>
                  <span className="text-slate-400">
                    目標: {data.settings.dailyGoalDrinks} Unit
                  </span>
                </div>
              </div>

              <div className={`p-4 rounded-2xl border ${isOverGoal ? 'bg-red-50 border-red-100' : 'bg-emerald-50 border-emerald-100'}`}>
                <p className={`text-sm font-black ${isOverGoal ? 'text-red-800' : 'text-emerald-800'}`}>
                  {isOverGoal ? '⚠️ 飲み過ぎです！' : '👍 目標達成中！'}
                </p>
                <p className={`text-[10px] mt-0.5 font-bold ${isOverGoal ? 'text-red-600/70' : 'text-emerald-600/70'}`}>
                  {isOverGoal ? '白湯を飲んで肝臓を休めましょう。' : '適量を守れていて素晴らしいです。'}
                </p>
              </div>
              <Activity className={`absolute right-[-20px] top-[-20px] w-32 h-32 opacity-[0.03] text-slate-900 pointer-events-none group-hover:scale-110 transition-transform duration-700`} />
            </div>

            {/* Monthly Stats */}
            <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">今月の合計</span>
              <div className="mt-2">
                <span className="text-xl font-black text-indigo-600">{stats.monthDrinks.toFixed(1)} <span className="text-[10px] uppercase">Unit</span></span>
                <p className="text-[10px] font-bold text-slate-400 mt-0.5 tracking-tight">¥{stats.monthSpent.toLocaleString()}</p>
              </div>
            </div>

            {/* Achievement */}
            <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">目標達成</span>
              <div className="mt-2">
                <span className="text-xl font-black text-emerald-600">{stats.achievedDays} <span className="text-[10px] uppercase font-bold text-slate-400">日</span></span>
                <div className="text-[9px] font-black text-emerald-500 uppercase mt-0.5 tracking-tighter">Nice Progress</div>
              </div>
            </div>

            {/* Latest Health (Small Tiles) */}
            <div className="bg-white p-5 rounded-[32px] border border-slate-200 shadow-sm col-span-2 space-y-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">最近の健康値</p>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <p className="text-[10px] font-bold text-slate-500">体重</p>
                  <p className="text-xl font-black text-slate-900 flex items-baseline gap-1">
                    {stats.latestWeight || '--'} <span className="text-[10px] text-slate-400 font-bold">kg</span>
                  </p>
                </div>
                <div className={`p-3 rounded-2xl border ${stats.latestGTP > 50 ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                  <p className={`text-[9px] font-black mb-1 ${stats.latestGTP > 50 ? 'text-rose-600' : 'text-slate-500'}`}>γ-GTP</p>
                  <p className={`text-xl font-black ${stats.latestGTP > 50 ? 'text-rose-700' : 'text-slate-900'} leading-none`}>
                    {stats.latestGTP || '--'} <span className="text-[9px]">U/L</span>
                  </p>
                  {stats.latestGTP > 50 && (
                    <p className="text-[8px] text-rose-400 font-bold mt-1 tracking-tighter">基準超過!</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Input Section (Bento Tile) */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <PlusCircle className="w-3 h-3 text-slate-400" />
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">データの記録</h2>
          </div>

          <div className="bg-white rounded-[32px] p-2 border border-slate-200 shadow-md ring-4 ring-indigo-50/30">
            <div className="flex p-1 gap-1">
              <button 
                onClick={() => setInputTab('alcohol')}
                className={`flex-1 py-3 text-xs font-black rounded-[20px] transition-all ${inputTab === 'alcohol' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                お酒
              </button>
              <button 
                onClick={() => setInputTab('weight')}
                className={`flex-1 py-3 text-xs font-black rounded-[20px] transition-all ${inputTab === 'weight' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                体重
              </button>
              <button 
                onClick={() => setInputTab('blood')}
                className={`flex-1 py-3 text-xs font-black rounded-[20px] transition-all ${inputTab === 'blood' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                血液検査
              </button>
            </div>

            <div className="p-5">
              <AnimatePresence mode="wait">
                {inputTab === 'alcohol' && (
                  <motion.form 
                    key="alcohol-form"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    onSubmit={handleAddAlcohol} className="space-y-4"
                  >
                    {/* Presets */}
                    <div className="flex flex-wrap gap-2 mb-2">
                      {ALCOHOL_PRESETS.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => applyPreset(p)}
                          className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-[9px] font-black transition-colors border border-slate-200"
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">日付</label>
                        <input type="date" required value={alcoholForm.date} onChange={e => setAlcoholForm({...alcoholForm, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">酒類</label>
                        <input type="text" required placeholder="ビール等" value={alcoholForm.name} onChange={e => setAlcoholForm({...alcoholForm, name: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">飲んだ量 (ml)</label>
                        <input type="number" required placeholder="500" value={alcoholForm.volume} onChange={e => setAlcoholForm({...alcoholForm, volume: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">度数 (%)</label>
                        <input type="number" step="0.1" required placeholder="5.0" value={alcoholForm.abv} onChange={e => setAlcoholForm({...alcoholForm, abv: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                    </div>

                    {/* Price Mode Selector */}
                    <div className="flex items-center gap-2 px-1">
                      <button 
                        type="button" 
                        onClick={() => setUsePriceCalc(!usePriceCalc)}
                        className={`text-[10px] font-black uppercase tracking-tighter px-2 py-1 rounded ${usePriceCalc ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}
                      >
                        {usePriceCalc ? '単価計算モード ON' : '単価計算モード OFF'}
                      </button>
                    </div>

                    {usePriceCalc ? (
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                        <p className="text-[9px] font-black text-indigo-400 uppercase">まとめ買いの価格を入力</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-black text-slate-400 ml-1">購入総量 (ml)</label>
                            <input type="number" value={calcBase.purchaseVolume} onChange={e => setCalcBase({...calcBase, purchaseVolume: e.target.value})} className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs" placeholder="4000" />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[8px] font-black text-slate-400 ml-1">購入金額 (¥)</label>
                            <input type="number" value={calcBase.purchasePrice} onChange={e => setCalcBase({...calcBase, purchasePrice: e.target.value})} className="w-full bg-white border-none rounded-lg px-3 py-2 text-xs" placeholder="3000" />
                          </div>
                        </div>
                        <div className="text-[10px] font-bold text-indigo-800 text-right">
                          1杯あたりの計算：<span className="text-sm font-black underline">¥{alcoholForm.price}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">金額 (¥)</label>
                        <input type="number" required placeholder="300" value={alcoholForm.price} onChange={e => setAlcoholForm({...alcoholForm, price: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                    )}

                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                       データを保存する
                    </button>
                  </motion.form>
                )}
                {inputTab === 'weight' && (
                  <motion.form 
                    key="weight-form"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    onSubmit={handleAddWeight} className="space-y-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">日付</label>
                      <input type="date" required value={weightForm.date} onChange={e => setWeightForm({...weightForm, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">体重 (kg)</label>
                      <input type="number" step="0.1" required placeholder="70.5" value={weightForm.weight} onChange={e => setWeightForm({...weightForm, weight: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                       データを保存する
                    </button>
                  </motion.form>
                )}
                {inputTab === 'blood' && (
                  <motion.form 
                    key="blood-form"
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    onSubmit={handleAddBlood} className="space-y-4"
                  >
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">検査日</label>
                      <input type="date" required value={bloodForm.date} onChange={e => setBloodForm({...bloodForm, date: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">γ-GTP</label>
                        <input type="number" required placeholder="50" value={bloodForm.gammaGTP} onChange={e => setBloodForm({...bloodForm, gammaGTP: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">AST</label>
                        <input type="number" required placeholder="30" value={bloodForm.ast} onChange={e => setBloodForm({...bloodForm, ast: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">ALT</label>
                        <input type="number" required placeholder="30" value={bloodForm.alt} onChange={e => setBloodForm({...bloodForm, alt: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1 tracking-wider">中性脂肪</label>
                        <input type="number" required placeholder="100" value={bloodForm.triglycerides} onChange={e => setBloodForm({...bloodForm, triglycerides: e.target.value})} className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100" />
                      </div>
                    </div>
                    <button type="submit" className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                       データを保存する
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* History Section (Bento Tile) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">最近の履歴</p>
          </div>

          <div className="bg-white rounded-[32px] p-6 border border-slate-200 shadow-sm overflow-hidden space-y-3">
            {data.alcoholRecords.length === 0 && data.weightRecords.length === 0 ? (
              <div className="py-12 text-center text-slate-300 italic text-sm">履歴がありません</div>
            ) : (
              [...data.alcoholRecords]
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 5)
                .map((record, i) => (
                  <div key={record.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-lg shadow-sm">🍺</div>
                      <div>
                        <p className="text-xs font-black text-slate-800">{record.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-tight">{record.date.replace(/-/g, '/')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={`text-xs font-black ${record.drinks > 2 ? 'text-rose-500' : 'text-slate-800'}`}>
                          {record.drinks.toFixed(1)} <span className="text-[9px] uppercase font-bold text-slate-400">Unit</span>
                        </p>
                        <p className="text-[10px] font-bold text-slate-300">¥{record.price.toLocaleString()}</p>
                      </div>
                      <button onClick={() => handleDelete('alcohol', record.id)} className="p-2 text-slate-200 hover:text-rose-400 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
            )}
            {data.alcoholRecords.length > 5 && (
              <button onClick={() => setActiveTab('history')} className="w-full py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 transition-colors">
                View all History
              </button>
            )}
          </div>
        </section>
        </>)}
      </main>

      {/* Footer Nav Bar */}
      <nav className="fixed bottom-6 left-6 right-6 flex justify-around items-center bg-white/80 backdrop-blur-lg py-3 px-8 rounded-full shadow-2xl border border-slate-100 z-50 ring-1 ring-slate-900/5">
        <button onClick={() => setActiveTab('input')} className={`flex flex-col items-center gap-1 ${activeTab === 'input' ? 'text-indigo-600' : 'text-slate-400'} transition-transform active:scale-95`}>
          <div className={`w-6 h-6 ${activeTab === 'input' ? 'bg-indigo-100' : 'bg-slate-100'} rounded-full flex items-center justify-center text-xs`}>
            {activeTab === 'input' ? '●' : ''}
          </div>
          <span className="text-[10px] font-black uppercase tracking-tighter">ホーム</span>
        </button>
        <button onClick={() => setActiveTab('history')} className={`flex flex-col items-center gap-1 ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'} transition-transform active:scale-95`}>
          <History className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-tighter">履歴</span>
        </button>
        <button onClick={() => setShowSettings(true)} className="flex flex-col items-center gap-1 text-slate-400 transition-transform active:scale-95">
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-black uppercase tracking-tighter">設定</span>
        </button>
      </nav>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-xs rounded-[32px] p-6 space-y-6 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Settings className="w-5 h-5 text-indigo-600" />
                </div>
                <h2 className="font-black text-lg tracking-tight">ユーザー設定</h2>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">お名前</label>
                  <input 
                    type="text" 
                    value={settingsForm.name} 
                    onChange={e => setSettingsForm({...settingsForm, name: e.target.value})}
                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-100"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider ml-1">目標ドリンク数 (Unit)</label>
                  <div className="flex items-center gap-4">
                    <input 
                      type="range" 
                      min="0.5" 
                      max="10" 
                      step="0.5"
                      value={settingsForm.dailyGoalDrinks} 
                      onChange={e => setSettingsForm({...settingsForm, dailyGoalDrinks: Number(e.target.value)})}
                      className="flex-1 accent-indigo-600"
                    />
                    <span className="font-black text-indigo-600 w-8">{settingsForm.dailyGoalDrinks}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    ※厚生労働省では節度ある飲酒量を1日平均20g(1 Unit)程度としています。
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setShowSettings(false)}
                  className="flex-1 py-3 text-sm font-black text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  閉じる
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 py-3 text-sm font-black bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-[0.98]"
                >
                  保存
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}


