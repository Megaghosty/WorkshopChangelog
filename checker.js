const fs = require('fs');

const COLLECTION_ID = "2517487893";
const JSON_FILE = './history.json';
const PROXY_URL = "https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/";

async function checkWorkshop() {
  try {
    // 1. Charger l'historique existant
    let history = { current: [], added: [], removed: [] };
    if (fs.existsSync(JSON_FILE)) {
      history = JSON.parse(fs.readFileSync(JSON_FILE, 'utf8'));
    }

    // 2. Récupérer l'état actuel de la collection sur Steam
    const params = new URLSearchParams();
    params.append('collectioncount', '1');
    params.append('publishedfileids[0]', COLLECTION_ID);

    const response = await fetch(PROXY_URL, { method: 'POST', body: params });
    const data = await response.json();
    
    const items = data.response.collectiondetails[0].children;
    if (!items) {
      console.log("La collection est vide ou introuvable.");
      return;
    }

    const latestIds = items.map(item => item.publishedfileid);
    const oldIds = history.current || [];

    // 3. Calculer les différences (Nouveaux et Supprimés)
    const justAdded = latestIds.filter(id => !oldIds.includes(id));
    const justRemoved = oldIds.filter(id => !latestIds.includes(id));

    // Mettre à jour la liste globale des "Ajoutés récemment" sans écraser les anciens si on veut accumuler l'historique
    // On fusionne les nouveautés en évitant les doublons
    let totalAdded = Array.from(new Set([...(history.added || []), ...justAdded]));
    let totalRemoved = Array.from(new Set([...(history.removed || []), ...justRemoved]));

    // Si un item revient dans la collection, on le retire de la liste des supprimés
    totalRemoved = totalRemoved.filter(id => !latestIds.includes(id));
    // Si un item a été supprimé, on le retire de la liste des ajoutés récents
    totalAdded = totalAdded.filter(id => latestIds.includes(id));

    // 4. Sauvegarder le résultat final
    history.current = latestIds;
    history.added = totalAdded;
    history.removed = totalRemoved;

    fs.writeFileSync(JSON_FILE, JSON.stringify(history, null, 2));
    console.log("Historique de la collection mis à jour avec succès !");

  } catch (error) {
    console.error("Erreur d'exécution :", error);
    process.exit(1);
  }
}

checkWorkshop();