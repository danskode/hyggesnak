import { Router } from 'express';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { gifSearchLimiter } from '../middleware/rateLimitersMiddleware.js';
import { config } from '../config/config.js';
import { cachedTrending, cachedSearch } from '../utils/gifCache.js';

const router = Router();

//==== Provider implementations ====//

const providers = {
    giphy: {
        isConfigured: () => !!config.giphyApiKey,
        async trending() {
            const url = `https://api.giphy.com/v1/gifs/trending?api_key=${config.giphyApiKey}&limit=6&rating=g`;
            const data = await fetchJson(url, 'Giphy');
            return (data.data || []).map(mapGiphyGif);
        },
        async search(q) {
            const url = `https://api.giphy.com/v1/gifs/search?api_key=${config.giphyApiKey}&q=${encodeURIComponent(q)}&limit=6&rating=g`;
            const data = await fetchJson(url, 'Giphy');
            return (data.data || []).map(mapGiphyGif);
        }
    },
    heypster: {
        isConfigured: () => !!config.heypsterApiKey,
        async trending() {
            const url = `https://api.heypster.com/v1/featured?key=${config.heypsterApiKey}&limit=6&media_filter=gif`;
            const data = await fetchJson(url, 'Heypster');
            return (data.results || []).map(mapHeypsterGif);
        },
        async search(q) {
            const url = `https://api.heypster.com/v1/search?key=${config.heypsterApiKey}&q=${encodeURIComponent(q)}&limit=6&media_filter=gif`;
            const data = await fetchJson(url, 'Heypster');
            return (data.results || []).map(mapHeypsterGif);
        }
    }
};

function mapGiphyGif(item) {
    return {
        id: item.id,
        url: item.images?.original?.url || item.url,
        preview_url: item.images?.fixed_height_small?.url || item.images?.original?.url,
        description: item.title || ''
    };
}

function mapHeypsterGif(item) {
    return {
        id: item.id,
        url: item.media_formats?.gif?.url || item.url,
        preview_url: item.media_formats?.tinygif?.url || item.url,
        description: item.content_description || ''
    };
}

async function fetchJson(url, providerName) {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`${providerName} API fejlede med status ${response.status}`);
    }
    return response.json();
}

function getProvider() {
    const name = config.gifProvider;
    const provider = providers[name];
    if (!provider) {
        return null;
    }
    return provider.isConfigured() ? provider : null;
}

//==== GET /api/gifs/trending - Trending GIFs ====//

router.get('/gifs/trending', authenticateToken, gifSearchLimiter, async (req, res) => {
    const provider = getProvider();
    if (!provider) {
        return res.status(503).send({ message: "GIF-service er ikke konfigureret. Sæt GIF_PROVIDER og den tilhørende API-nøgle i .env" });
    }

    try {
        const gifs = await cachedTrending(config.gifProvider, () => provider.trending());
        res.send({ data: gifs });
    } catch (err) {
        console.error('Error fetching trending GIFs:', err);
        res.status(502).send({ message: "GIF-service fejlede" });
    }
});

//==== GET /api/gifs/search?q= - Search GIFs ====//

router.get('/gifs/search', authenticateToken, gifSearchLimiter, async (req, res) => {
    const provider = getProvider();
    if (!provider) {
        return res.status(503).send({ message: "GIF-service er ikke konfigureret. Sæt GIF_PROVIDER og den tilhørende API-nøgle i .env" });
    }

    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length === 0) {
        return res.status(400).send({ message: "Søgeord mangler" });
    }

    if (q.length > 100) {
        return res.status(400).send({ message: "Søgeord er for langt" });
    }

    try {
        const gifs = await cachedSearch(config.gifProvider, q.trim(), () => provider.search(q.trim()));
        res.send({ data: gifs });
    } catch (err) {
        console.error('Error searching GIFs:', err);
        res.status(502).send({ message: "GIF-service fejlede" });
    }
});

export default router;
