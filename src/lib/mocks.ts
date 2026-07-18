import type { Sighting, User } from "../types";

/**
 * Mock data used while the real backend is not available.
 * Safe to delete once the API client is wired up.
 */

export const mockUsers: User[] = [
  { id: "u_1", username: "carlosr", displayName: "Carlos Ramírez" },
  { id: "u_2", username: "anae", displayName: "Ana Exploradora" },
  { id: "u_3", username: "luism", displayName: "Luis Méndez" },
];

export const mockSightings: Sighting[] = [
  {
    id: "s_1",
    species: "Ara macao",
    commonName: "Guacamaya tricolor",
    description:
      "Una pareja de guacamayas sobrevolando el dosel al amanecer. Colores increíbles.",
    imageUrl:
      "https://images.unsplash.com/photo-1456926631375-92c8ce872def?auto=format&fit=crop&w=800&q=80",
    location: "Reserva Natural El Tuparro",
    category: "Aves",
    latitude: 4.18,
    longitude: -69.55,
    createdAt: "2026-07-09T12:30:00.000Z",
    likes: 128,
    comments: 14,
    author: mockUsers[0],
  },
  {
    id: "s_2",
    species: "Cattleya trianae",
    commonName: "Orquídea de mayo",
    description: "Flor nacional de Colombia avistada junto al sendero principal.",
    imageUrl:
      "https://images.unsplash.com/photo-1567748157439-651aca2ff064?auto=format&fit=crop&w=800&q=80",
    location: "Jardín Botánico de Bogotá",
    category: "Flora",
    latitude: 4.66,
    longitude: -74.1,
    createdAt: "2026-07-09T09:10:00.000Z",
    likes: 86,
    comments: 7,
    author: mockUsers[1],
  },
  {
    id: "s_3",
    species: "Amazilia amazilia",
    commonName: "Colibrí amazilia",
    description: "Alimentándose de néctar en una flor de platanillo.",
    imageUrl:
      "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?auto=format&fit=crop&w=800&q=80",
    location: "Parque Nacional Chingaza",
    category: "Aves",
    latitude: 4.63,
    longitude: -73.77,
    createdAt: "2026-07-08T18:45:00.000Z",
    likes: 54,
    comments: 3,
    author: mockUsers[2],
  },
  {
    id: "s_4",
    species: "Dryophytes ebraccatae",
    commonName: "Rana de cristal",
    description: "Pequeña rana transparente cerca del charco después de la lluvia.",
    imageUrl:
      "https://images.unsplash.com/photo-1545350484-54a0a7e9a3f3?auto=format&fit=crop&w=800&q=80",
    location: "Reserva Natural La Planada",
    category: "Fauna",
    latitude: 1.13,
    longitude: -78.07,
    createdAt: "2026-07-08T15:20:00.000Z",
    likes: 39,
    comments: 5,
    author: mockUsers[0],
  },
  {
    id: "s_5",
    species: "Morpho menelaus",
    commonName: "Mariposa morpho",
    description: "Sus alas azules brillaban con la luz del mediodía.",
    imageUrl:
      "https://images.unsplash.com/photo-1517169304124-931b8a5f6596?auto=format&fit=crop&w=800&q=80",
    location: "Amazonía colombiana",
    category: "Insectos",
    latitude: -3.46,
    longitude: -62.21,
    createdAt: "2026-07-07T11:05:00.000Z",
    likes: 212,
    comments: 28,
    author: mockUsers[1],
  },
];
