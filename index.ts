const BASE_URL = 'https://www.torrent9.zone';

interface Torrent {
    title: string;
    link: string;
}

interface Search {
    url: string;
    maxPage: number;
}

const search = {
    films: { url: 'films', maxPage: 746 } as Search,
    series: { url: 'series', maxPage: 1239 } as Search,
};

/**
 * Récupère la liste des torrents de la page donnée
 * 
 * @param {number} page - Numéro de la page
 * @returns {Promise<Torrent[]>} - Liste des torrents de la page
 */
async function fetchTorrentList(page: number, type: Search): Promise<Torrent[]> {
    const reponse = await fetch(`${BASE_URL}/torrents/${type.url}.html,page-${page}&trie-nom-a`);
    const data = await reponse.text();

    const regex = /<a\s.*?title="([^"]*)".*?href="([^"]*)".*?>/gm;
    const matches = data.matchAll(regex);

    const list = [];

    for (const match of matches) {
        list.push({ title: match[1], link: `${BASE_URL}${match[2]}` });
    }

    return list;
}

/**
 * Récupère la liste des torrents correspondant au titre donné
 * 
 * @param {string} title - Titre à rechercher
 * @param {Search} type - Type de recherche (films ou séries)
 * @returns {Promise<Torrent[]>} - Liste des torrents correspondant au titre
 */
async function fetchTorrentByTitle(title: string, type: Search): Promise<Torrent[]> {
    const finalList: Torrent[] = [];

    const promises: Promise<Torrent[]>[] = [];

    // Générer les promesses pour chaque page
    for (let i = 1; i <= type.maxPage; i++) {
        promises.push(fetchTorrentList(i, type));
    }

    // Paralléliser les appels pour obtenir les listes de torrents
    const responses = await Promise.allSettled(promises);

    // Filtrer les résultats et aplatir les listes
    for (const response of responses) {
        if (response.status === 'fulfilled') {
            const torrents: Torrent[] = response.value.filter(torrent =>
                torrent.title.toLowerCase().includes(title.toLowerCase())
            );
            finalList.push(...torrents);
        }
    }

    return finalList;
}

Bun.serve({
    async fetch(request) {
        const data: FormData = await request.formData();
        const title: string = data.get('title') as string;
        const type: keyof typeof search = data.get('type') as keyof typeof search;

        const list = await fetchTorrentByTitle(title, search[type]);

        return Response.json(list);
    },
    port: 3000
});
