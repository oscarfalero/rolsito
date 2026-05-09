import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { sceneService } from '../services/api.service';
import { Scene } from '../types';

const SCENE_TYPES = ['indoor', 'outdoor', 'dungeon', 'town', 'wilderness'];

export default function ScenesManager() {
  const { id } = useParams<{ id: string }>();
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('indoor');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadScenes();
  }, [id]);

  const loadScenes = () => {
    sceneService.getByCampaign(id!).then(setScenes);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sceneService.create(id!, { name, description, type });
    setName('');
    setDescription('');
    setType('indoor');
    loadScenes();
    setLoading(false);
  };

  const handleActivate = async (sceneId: string) => {
    await sceneService.activate(id!, sceneId);
    loadScenes();
  };

  const handleDelete = async (sceneId: string) => {
    if (!confirm('Delete this scene?')) return;
    await sceneService.remove(sceneId);
    loadScenes();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to={`/campaigns/${id}`} className="text-indigo-400 hover:text-indigo-300 text-sm">← Back to Campaign</Link>
        <h1 className="text-3xl font-bold mt-4 mb-8">Scene Management</h1>

        <form onSubmit={handleCreate} className="bg-gray-800 rounded-lg p-6 mb-8 space-y-4">
          <h2 className="text-lg font-bold">Create New Scene</h2>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name</label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-indigo-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Type</label>
            <select
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:outline-none focus:ring-indigo-500"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {SCENE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded disabled:opacity-50"
          >
            Create Scene
          </button>
        </form>

        <div className="space-y-4">
          {scenes.map((scene) => (
            <div key={scene.id} className="bg-gray-800 rounded-lg p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold">{scene.name}</h3>
                  <p className="text-gray-400 text-sm">{scene.type}</p>
                  {scene.description && <p className="text-gray-300 mt-1 text-sm">{scene.description}</p>}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleActivate(scene.id)}
                    className="px-3 py-1 bg-green-700 hover:bg-green-600 rounded text-sm"
                  >
                    Set Active
                  </button>
                  <button
                    onClick={() => handleDelete(scene.id)}
                    className="px-3 py-1 bg-red-700 hover:bg-red-600 rounded text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
