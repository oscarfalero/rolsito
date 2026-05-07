import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { campaignService } from '../services/api.service';

const SYSTEM_PROMPT_TEMPLATES = [
  {
    name: 'Classic Fantasy',
    prompt: 'You are a wise and experienced Dungeon Master in a classic high fantasy world filled with magic, dragons, and ancient dungeons. You narrate epic adventures with a Tolkien-esque atmosphere.',
  },
  {
    name: 'Dark & Gritty',
    prompt: 'You are a grim Dungeon Master in a dark fantasy world where danger lurks in every shadow. Survival is uncertain, and moral choices have heavy consequences.',
  },
  {
    name: 'Humorous',
    prompt: 'You are a whimsical and humorous Dungeon Master who loves puns, absurd situations, and fourth-wall breaking. The campaign is lighthearted and fun.',
  },
  {
    name: 'Mystery & Intrigue',
    prompt: 'You are a cunning Dungeon Master specializing in political intrigue, mysteries, and detective stories. The world is full of secrets waiting to be uncovered.',
  },
];

export default function CampaignNew() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(4);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTemplateSelect = (template: typeof SYSTEM_PROMPT_TEMPLATES[0]) => {
    setSelectedTemplate(template.name);
    setSystemPrompt(template.prompt);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const campaign = await campaignService.create({
        name,
        description,
        systemPrompt,
        maxPlayers,
      });
      navigate(`/campaigns/${campaign.id}`);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-white mb-8">Create New Campaign</h1>

        {error && (
          <div className="bg-red-900 border border-red-700 text-red-200 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Campaign Name
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="The Lost Kingdom"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description
            </label>
            <textarea
              rows={3}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A brief description of your campaign world..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              DM Personality Template
            </label>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {SYSTEM_PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template.name}
                  type="button"
                  onClick={() => handleTemplateSelect(template)}
                  className={`p-3 rounded-md border text-left text-sm ${
                    selectedTemplate === template.name
                      ? 'border-indigo-500 bg-indigo-900 text-white'
                      : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{template.name}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Custom DM Instructions (System Prompt)
            </label>
            <textarea
              rows={6}
              required
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Describe how the DM should behave, the world rules, tone, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Max Players
            </label>
            <input
              type="number"
              min={2}
              max={10}
              className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-800 text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(parseInt(e.target.value))}
            />
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-4 py-2 border border-gray-600 rounded-md text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
