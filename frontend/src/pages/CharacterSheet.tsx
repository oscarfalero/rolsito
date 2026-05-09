import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { characterManagementService } from '../services/api.service';
import { Character } from '../types';

function calculateModifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

export default function CharacterSheet() {
  const { id, characterId } = useParams<{ id: string; characterId: string }>();
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    characterManagementService.getOne(characterId!).then((data) => {
      setCharacter(data);
      setLoading(false);
    });
  }, [characterId]);

  if (loading) return <div className="min-h-screen bg-gray-900 text-white p-8">Loading...</div>;
  if (!character) return <div className="min-h-screen bg-gray-900 text-white p-8">Character not found</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to={`/campaigns/${id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to Campaign</Link>
        
        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{character.name}</h1>
              <p className="text-gray-400 mt-1">{character.race} {character.class} (Level {character.level})</p>
            </div>
            <div className="flex space-x-4">
              <div className="bg-red-900 px-4 py-2 rounded text-center">
                <div className="text-xs text-red-300">HP</div>
                <div className="text-xl font-bold">{character.currentHp}/{character.maxHp}</div>
              </div>
              <div className="bg-blue-900 px-4 py-2 rounded text-center">
                <div className="text-xs text-blue-300">AC</div>
                <div className="text-xl font-bold">{character.ac}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          {Object.entries(character.stats).map(([stat, value]) => (
            <div key={stat} className="bg-gray-800 rounded-lg p-4 text-center">
              <div className="text-xs text-gray-400 uppercase">{stat}</div>
              <div className="text-2xl font-bold">{value}</div>
              <div className={`text-sm ${calculateModifier(value) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {calculateModifier(value) >= 0 ? '+' : ''}{calculateModifier(value)}
              </div>
            </div>
          ))}
        </div>

        {character.backstory && (
          <div className="mt-6 bg-gray-800 rounded-lg p-6">
            <h2 className="text-lg font-bold mb-2">Backstory</h2>
            <p className="text-gray-300 whitespace-pre-wrap">{character.backstory}</p>
          </div>
        )}

        <div className="mt-6 bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-bold mb-4">Inventory</h2>
          {character.inventory && character.inventory.length > 0 ? (
            <div className="space-y-2">
              {character.inventory.map((inv) => (
                <div key={inv.id} className="flex justify-between items-center bg-gray-700 p-3 rounded">
                  <div>
                    <span className="font-medium">{inv.item.name}</span>
                    <span className="text-gray-400 text-sm ml-2">({inv.item.type})</span>
                  </div>
                  <span className="text-gray-400">x{inv.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500">No items</p>
          )}
        </div>
      </div>
    </div>
  );
}
