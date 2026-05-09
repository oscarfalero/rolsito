import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { characterService } from '../services/api.service';

const STANDARD_ARRAY = [15, 14, 13, 12, 10, 8];
const STATS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const RACES = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Orc', 'Tiefling'];
const CLASSES = ['Fighter', 'Wizard', 'Rogue', 'Cleric', 'Ranger', 'Paladin', 'Barbarian', 'Bard'];
const CLASS_BASE_HP: Record<string, number> = {
  Fighter: 10, Wizard: 6, Rogue: 8, Cleric: 8,
  Ranger: 10, Paladin: 10, Barbarian: 12, Bard: 8,
};

function calculateModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

function calculateHp(className: string, con: number): number {
  const base = CLASS_BASE_HP[className] || 8;
  return base + calculateModifier(con);
}

function calculateAc(dex: number): number {
  return 10 + calculateModifier(dex);
}

export default function CharacterNew() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [race, setRace] = useState('');
  const [className, setClassName] = useState('');
  const [stats, setStats] = useState<Record<string, number>>({
    str: 0, dex: 0, con: 0, int: 0, wis: 0, cha: 0,
  });
  const [backstory, setBackstory] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const getAvailableValues = (statKey: string): number[] => {
    const used = Object.entries(stats)
      .filter(([k]) => k !== statKey)
      .map(([, v]) => v)
      .filter((v) => v > 0);
    return STANDARD_ARRAY.filter((v) => !used.includes(v));
  };

  const handleStatChange = (stat: string, value: number) => {
    setStats((prev) => ({ ...prev, [stat]: value }));
  };

  const hp = className && stats.con > 0 ? calculateHp(className, stats.con) : 0;
  const ac = stats.dex > 0 ? calculateAc(stats.dex) : 0;

  const canProceedStep2 = () => {
    return Object.values(stats).every((v) => v > 0) &&
      new Set(Object.values(stats)).size === 6;
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      await characterService.create(id!, {
        name,
        race,
        class: className,
        stats,
        backstory,
      });
      navigate(`/campaigns/${id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create character');
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Character Name</label>
        <input
          type="text"
          required
          minLength={2}
          maxLength={50}
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Aldric the Brave"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Race</label>
          <select
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={race}
            onChange={(e) => setRace(e.target.value)}
          >
            <option value="">Select race</option>
            {RACES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Class</label>
          <select
            className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
          >
            <option value="">Select class</option>
            {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>
      <button
        onClick={() => setStep(2)}
        disabled={!name || !race || !className}
        className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
      >
        Next: Assign Stats
      </button>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        {STATS.map((stat) => (
          <div key={stat}>
            <label className="block text-sm font-medium text-gray-300 mb-1 uppercase">
              {stat} {stats[stat] > 0 && (
                <span className={calculateModifier(stats[stat]) >= 0 ? 'text-green-400' : 'text-red-400'}>
                  ({calculateModifier(stats[stat]) >= 0 ? '+' : ''}{calculateModifier(stats[stat])})
                </span>
              )}
            </label>
            <select
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={stats[stat] || ''}
              onChange={(e) => handleStatChange(stat, Number(e.target.value))}
            >
              <option value="">Select</option>
              {getAvailableValues(stat).map((v) => (
                <option key={v} value={v}>{v}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      <div className="bg-gray-800 p-4 rounded-md">
        <div className="flex justify-between text-sm text-gray-300">
          <span>HP Preview: <span className="text-green-400 font-bold">{hp}</span></span>
          <span>AC Preview: <span className="text-blue-400 font-bold">{ac}</span></span>
        </div>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={() => setStep(1)}
          className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800"
        >
          Back
        </button>
        <button
          onClick={() => setStep(3)}
          disabled={!canProceedStep2()}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
        >
          Next: Review
        </button>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Backstory</label>
        <textarea
          rows={4}
          maxLength={2000}
          className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          value={backstory}
          onChange={(e) => setBackstory(e.target.value)}
          placeholder="Tell us about your character's past..."
        />
      </div>
      <div className="bg-gray-800 p-4 rounded-md space-y-2">
        <h3 className="font-bold text-white text-lg">{name}</h3>
        <p className="text-gray-400">{race} {className} (Level 1)</p>
        <div className="grid grid-cols-3 gap-2 text-sm mt-2">
          {STATS.map((s) => (
            <div key={s} className="text-gray-300">
              {s.toUpperCase()}: {stats[s]} ({calculateModifier(stats[s]) >= 0 ? '+' : ''}{calculateModifier(stats[s])})
            </div>
          ))}
        </div>
        <div className="flex space-x-4 text-sm mt-2 pt-2 border-t border-gray-700">
          <span className="text-green-400 font-bold">HP: {hp}</span>
          <span className="text-blue-400 font-bold">AC: {ac}</span>
        </div>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={() => setStep(2)}
          className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800"
        >
          Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
        >
          {loading ? 'Creating...' : 'Create Character'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">Create Character</h1>
        <p className="text-gray-400 mb-8">Step {step} of 3</p>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
      </div>
    </div>
  );
}
