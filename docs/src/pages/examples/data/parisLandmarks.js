/**
 * Deterministic fallback for the isometric Paris example.
 *
 * Coordinates and resource URIs mirror the fields returned by the DBpedia
 * endpoint adapter. The live request may replace this set when it returns
 * enough spatial coverage; keeping this fixture makes the examples page
 * render immediately and remain useful offline.
 */
export const PARIS_CENTER = {
  id: "http://dbpedia.org/resource/Paris",
  name: "Paris",
  kind: "city",
  lon: 2.3522,
  lat: 48.8566,
  uri: "http://dbpedia.org/resource/Paris",
}

export const PARIS_LANDMARK_FIXTURE = [
  PARIS_CENTER,
  landmark("Gisors Castle", "defense", 1.7764, 49.2794, "Gisors_Castle"),
  landmark("Beauvais Cathedral", "faith", 2.0817, 49.4328, "Beauvais_Cathedral"),
  landmark("Musée Gallé-Juillet", "culture", 2.4833, 49.2583, "Musée_Gallé-Juillet"),
  landmark("Château de Raray", "defense", 2.7158, 49.2608, "Château_de_Raray"),
  landmark("Château de Pierrefonds", "defense", 2.9808, 49.3469, "Château_de_Pierrefonds"),
  landmark("Fondation Monet", "culture", 1.5339, 49.0754, "Fondation_Monet_in_Giverny"),
  landmark("CY Cergy Paris University", "knowledge", 2.0758, 49.0389, "CY_Cergy_Paris_University"),
  landmark("Château de Chantilly", "culture", 2.4858, 49.1939, "Château_de_Chantilly"),
  landmark("Charles de Gaulle Airport", "transport", 2.55, 49.0097, "Charles_de_Gaulle_Airport"),
  landmark("Château de La Ferté-Milon", "defense", 3.1233, 49.1778, "Château_de_La_Ferté-Milon"),
  landmark("Château de Thoiry", "nature", 1.7947, 48.8658, "Château_de_Thoiry"),
  landmark("Palace of Versailles", "defense", 2.1204, 48.8049, "Palace_of_Versailles"),
  landmark("Disneyland Paris", "arena", 2.7836, 48.8674, "Disneyland_Paris"),
  landmark("La Ferté-sous-Jouarre Memorial", "monument", 3.1304, 48.9508, "La_Ferté-sous-Jouarre_memorial"),
  landmark("Château de Maintenon", "defense", 1.5783, 48.5872, "Château_de_Maintenon"),
  landmark("Château de Breteuil", "defense", 2.0208, 48.6803, "Château_de_Breteuil"),
  landmark("Évry Cathedral", "faith", 2.4419, 48.6239, "Évry_Cathedral"),
  landmark("Château de Vaux-le-Vicomte", "culture", 2.7139, 48.5658, "Vaux-le-Vicomte"),
  landmark("Château de Nangis", "defense", 3.0136, 48.5558, "Château_de_Nangis"),
  landmark("Chartres Cathedral", "faith", 1.4877, 48.4478, "Chartres_Cathedral"),
  landmark("Tour Guinette", "monument", 2.1594, 48.4342, "Tour_Guinette"),
  landmark("Château de Courances", "nature", 2.4747, 48.4406, "Château_de_Courances"),
  landmark("Palace of Fontainebleau", "culture", 2.7016, 48.4021, "Palace_of_Fontainebleau"),
  landmark("Musée de la Faïence", "culture", 2.9589, 48.3833, "Montereau-Fault-Yonne"),
]

function landmark(name, kind, lon, lat, slug) {
  const uri = `http://dbpedia.org/resource/${slug}`
  return { id: uri, name, kind, lon, lat, uri, source: "fixture" }
}
