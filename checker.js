const fs = require('fs');

const COLLECTION_ID = "2517487893";
const JSON_FILE = './history.json';
const PROXY_URL = "https://api.steampowered.com/ISteamRemoteStorage/GetCollectionDetails/v1/";

async function checkWorkshop() {
  try {
    // 1. Charger l'historique existant avec sécurité
    let history = { current: [], added: [], removed: [] };
    if (fs.existsSync(JSON_FILE)) {
      try {
        const fileContent = fs.readFileSync(JSON_FILE, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (parsed.current) history.current = parsed.current;
        if (parsed.added) history.added = parsed.added;
        if (parsed.removed) history.removed = parsed.removed;
      } catch (e) {
        console.log("Impossible de lire le JSON, création d'un nouveau.");
      }
    }

    // 2. Récupérer l'état actuel sur Steam
    const params = new URLSearchParams();
    params.append('collectioncount', '1');
    params.append('publishedfileids[0]', COLLECTION_ID);

    const response = await fetch(PROXY_URL, { method: 'POST', body: params });
    const data = await response.json();
    
    const items = data.response.collectiondetails[0].children;
    if (!items) {
      console.log("La collection Steam est introuvable ou vide.");
      return;
    }

    const latestIds = items.map(item => item.publishedfileid);
    const oldIds = history.current || [];

    // SI C'EST LE TOUT PREMIER SCAN (oldIds est vide), on initialise juste
    // pour éviter de tout mettre dans "Récemment ajoutés"
    if (oldIds.length === 0) {
      console.log("Premier scan détecté : Initialisation de la base de données.");
      history.current = latestIds;
      history.added = [];
      history.removed = [];
      fs.writeFileSync(JSON_FILE, JSON.stringify(history, null, 2));
      return;
    }

    // 3. Calculer les vrais changements
    const justAdded = latestIds.filter(id => !oldIds.includes(id));
    const justRemoved = oldIds.filter(id => !latestIds.includes(id));

    // Fusionner les nouveautés sans faire de doublons
    history.added = Array.from(new Set([...history.added, ...justAdded]));
    history.removed = Array.from(new Set([...history.removed, ...justRemoved]));

    // Nettoyage si un item supprimé revient ou inversement
    history.removed = history.removed.filter(id => !latestIds.includes(id));
    history.added = history.added.filter(id => latestIds.includes(id));

    // Sauvegarder la nouvelle collection actuelle
    history.current = latestIds;

    // 4. Écriture physique du fichier
    fs.writeFileSync(JSON_FILE, JSON.stringify(history, null, 2));
    console.log("Historique comparé et enregistré proprement !");

  } catch (error) {
    console.error("Erreur d'exécution :", error);
    process.exit(1);
  }
}

checkWorkshop();
