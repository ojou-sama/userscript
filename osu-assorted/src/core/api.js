import { settings } from './settings';

const API_BASE = 'https://osu.ppy.sh/api/v2';

// in-memory cache
let accessToken = settings.get('oauth_token', null);
let tokenExpiresAt = settings.get('oauth_expires_at', 0);

export const api = {
  async getToken() {
    const now = Date.now();
    
    // return cached token if it is valid for at least another 60 seconds
    if (accessToken && tokenExpiresAt > now + 60000) {
      return accessToken;
    }

    const clientId = settings.get('osu_client_id');
    const clientSecret = settings.get('osu_client_secret');

    if (!clientId || !clientSecret) {
      throw new Error('[osu! api] Client ID or Secret is missing. Please configure them in the settings.');
    }

    const response = await fetch('https://osu.ppy.sh/oauth/token', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: parseInt(clientId, 10),
        client_secret: clientSecret,
        grant_type: 'client_credentials',
        scope: 'public'
      })
    });

    if (!response.ok) {
      throw new Error(`[osu!api] Failed to fetch token: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    accessToken = data.access_token;
    tokenExpiresAt = Date.now() + (data.expires_in * 1000);

    // save to settings to persist across page reloads
    settings.set('oauth_token', accessToken);
    settings.set('oauth_expires_at', tokenExpiresAt);

    return accessToken;
  },

  // generic API request method
  async request(endpoint, options = {}) {
    const token = await this.getToken();
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint}`;

    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    });

    if (!res.ok) {
      throw new Error(`[osu!api] Request failed (${res.status}): ${endpoint}`);
    }

    return res.json();
  },

  /**
   * Fetch user profile data
   * @param {number|string} userId 
   * @param {string} mode - 'osu', 'taiko', 'fruits', 'mania' (Optional)
   */
  async getUser(userId, mode = '') {
    const modePath = mode ? `/${mode}` : '';
    return this.request(`/users/${userId}${modePath}`);
  },

  /**
   * Fetch a specific beatmap's data
   * @param {number|string} beatmapId 
   */
  async getBeatmap(beatmapId) {
    return this.request(`/beatmaps/${beatmapId}`);
  },

  /**
   * Fetch an entire beatmapset
   * @param {number|string} setId 
   */
  async getBeatmapset(setId) {
    return this.request(`/beatmapsets/${setId}`);
  },

  /**
   * Fetch a user's scores
   * @param {number|string} userId 
   * @param {string} type - 'best', 'firsts', or 'recent'
   * @param {number} limit - Default 10, Max 100
   * @param {number} offset - Default 0
   */
  async getUserScores(userId, type = 'best', limit = 10, offset = 0) {
    return this.request(`/users/${userId}/scores/${type}?limit=${limit}&offset=${offset}`);
  },

  /**
   * Fetch scores for a specific beatmap
   * @param {number|string} beatmapId 
   * @param {string} mode - 'osu', 'taiko', 'fruits', 'mania' (Optional)
   */
  async getBeatmapScores(beatmapId, mode = '') {
    const modeQuery = mode ? `?mode=${mode}` : '';
    return this.request(`/beatmaps/${beatmapId}/scores${modeQuery}`);
  }
};