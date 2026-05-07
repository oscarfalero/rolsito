import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/auth.store';
import { campaignService } from '../services/api.service';

export default function Dashboard() {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  const { data: myCampaigns, isLoading } = useQuery({
    queryKey: ['myCampaigns'],
    queryFn: () => campaignService.getMyCampaigns(),
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Navbar */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white">Rolsito</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-300">{user?.displayName || user?.username}</span>
              <button
                onClick={handleLogout}
                className="text-sm text-gray-400 hover:text-white"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-white">My Campaigns</h2>
          <Link
            to="/campaigns/new"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create Campaign
          </Link>
        </div>

        {isLoading ? (
          <div className="text-gray-400">Loading campaigns...</div>
        ) : !myCampaigns?.length ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg mb-4">No campaigns yet</p>
            <p className="text-gray-500">Create your first campaign to start playing!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myCampaigns.map((campaign: any) => (
              <div
                key={campaign.id}
                className="bg-gray-800 rounded-lg p-6 hover:bg-gray-750 border border-gray-700 hover:border-indigo-500 transition-colors"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-white">{campaign.name}</h3>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    campaign.status === 'active'
                      ? 'bg-green-900 text-green-200'
                      : campaign.status === 'draft'
                      ? 'bg-yellow-900 text-yellow-200'
                      : 'bg-gray-700 text-gray-300'
                  }`}>
                    {campaign.status}
                  </span>
                </div>
                <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                  {campaign.description || 'No description'}
                </p>
                <div className="flex justify-between items-center text-sm text-gray-500 mb-4">
                  <span>Max players: {campaign.maxPlayers}</span>
                  <span>Model: {campaign.dmModel}</span>
                </div>
                <div className="flex space-x-2">
                  <Link
                    to={`/campaigns/${campaign.id}`}
                    className="flex-1 text-center bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded text-sm"
                  >
                    View Lobby
                  </Link>
                  {campaign.status === 'active' && (
                    <Link
                      to={`/campaigns/${campaign.id}/play`}
                      className="flex-1 text-center bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 rounded text-sm"
                    >
                      Play
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
