import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { campaignService, characterService } from '../services/api.service';
import { useAuthStore } from '../stores/auth.store';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const { data: campaign, isLoading: campaignLoading } = useQuery({
    queryKey: ['campaign', id],
    queryFn: () => campaignService.getOne(id!),
  });

  const { data: characters } = useQuery({
    queryKey: ['characters', id],
    queryFn: () => characterService.getByCampaign(id!),
    enabled: !!id,
  });

  const isOwner = campaign?.createdById === user?.id;
  const isMember = campaign?.members?.some((m: any) => m.userId === user?.id);

  const handleJoin = async () => {
    try {
      await campaignService.join(id!);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to join campaign');
    }
  };

  if (campaignLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link to="/dashboard" className="text-indigo-400 hover:text-indigo-300 mb-4 inline-block">
          ← Back to Dashboard
        </Link>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 border border-gray-700">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{campaign.name}</h1>
              <p className="text-gray-400">{campaign.description || 'No description'}</p>
            </div>
            <div className="flex space-x-2">
              {isOwner && (
                <>
                  <Link
                    to={`/campaigns/${id}/scenes`}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm"
                  >
                    Scenes
                  </Link>
                  <Link
                    to={`/campaigns/${id}/play`}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
                  >
                    Start Game
                  </Link>
                </>
              )}
              {!isMember && !isOwner && (
                <button
                  onClick={handleJoin}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                >
                  Join Campaign
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-sm text-gray-400 mb-4">
            <div>
              <span className="font-medium">Status:</span>{' '}
              <span className="capitalize">{campaign.status}</span>
            </div>
            <div>
              <span className="font-medium">Max Players:</span> {campaign.maxPlayers}
            </div>
            <div>
              <span className="font-medium">AI Model:</span> {campaign.dmModel}
            </div>
          </div>

          {campaign.currentScene && (
            <div className="bg-gray-700 rounded p-3 mt-2">
              <div className="text-xs text-gray-500 uppercase">Current Scene</div>
              <div className="text-white font-medium">{campaign.currentScene.name}</div>
              <div className="text-sm text-gray-400">{campaign.currentScene.description}</div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Players */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <h2 className="text-xl font-semibold text-white mb-4">Players</h2>
            {campaign.members?.length ? (
              <div className="space-y-3">
                {campaign.members.map((member: any) => (
                  <div key={member.id} className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-medium">
                      {member.user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div className="text-white">{member.user?.username}</div>
                      <div className="text-xs text-gray-500 capitalize">{member.role}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No players yet</p>
            )}
          </div>

          {/* Characters */}
          <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">Characters</h2>
              {isMember && (
                <Link
                  to={`/campaigns/${id}/characters/new`}
                  className="text-sm text-indigo-400 hover:text-indigo-300"
                >
                  + Create
                </Link>
              )}
            </div>
            {characters?.length ? (
              <div className="space-y-3">
                {characters.map((character: any) => (
                  <Link
                    key={character.id}
                    to={`/campaigns/${id}/characters/${character.id}`}
                    className="bg-gray-700 rounded p-3 block hover:bg-gray-600 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="text-white font-medium">{character.name}</div>
                        <div className="text-sm text-gray-400">
                          {character.race} {character.class} (Level {character.level})
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          HP: {character.currentHp}/{character.maxHp} | AC: {character.ac}
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        by {character.user?.username}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No characters yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
