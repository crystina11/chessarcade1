export const AVATARS = [
  { id: 'bruiser', name: 'BRUISER', color: '#FF4D00', char: 'B', desc: 'Tank' },
  { id: 'ghost', name: 'GHOST', color: '#00D5FF', char: 'G', desc: 'Stealth' },
  { id: 'punk', name: 'PUNK', color: '#FFD000', char: 'P', desc: 'Agile' },
  { id: 'riot', name: 'RIOT', color: '#FF1A1A', char: 'R', desc: 'Brawler' },
  { id: 'vex', name: 'VEX', color: '#9D00FF', char: 'V', desc: 'Trickster' },
  { id: 'tank', name: 'TANK', color: '#00FF88', char: 'T', desc: 'Heavy' },
];

export const WEAPONS = {
  glock: {
    id: 'glock', name: 'GLOCK-18', type: 'pistol', slot: 'secondary',
    damage: 22, rpm: 400, mag: 18, reserve: 90, reload: 1.1,
    spread: 0.02, range: 50, projectile: false, pellets: 1,
    color: '#333', icon: '🔫',
    stats: { dmg: 45, firerate: 60, range: 50, mobility: 90 }
  },
  m4: {
    id: 'm4', name: 'M4A1', type: 'rifle', slot: 'primary',
    damage: 32, rpm: 700, mag: 30, reserve: 120, reload: 1.8,
    spread: 0.015, range: 100, projectile: false, pellets: 1,
    color: '#4A4A4A', icon: '🎯',
    stats: { dmg: 65, firerate: 70, range: 75, mobility: 70 }
  },
  ak: {
    id: 'ak', name: 'AK-47', type: 'rifle', slot: 'primary',
    damage: 38, rpm: 600, mag: 30, reserve: 90, reload: 2.0,
    spread: 0.025, range: 100, projectile: false, pellets: 1,
    color: '#8B4513', icon: '💥',
    stats: { dmg: 85, firerate: 55, range: 70, mobility: 65 }
  },
  mp7: {
    id: 'mp7', name: 'MP7', type: 'smg', slot: 'primary',
    damage: 20, rpm: 950, mag: 40, reserve: 160, reload: 1.6,
    spread: 0.03, range: 60, projectile: false, pellets: 1,
    color: '#2A2A2A', icon: '⚡',
    stats: { dmg: 40, firerate: 95, range: 45, mobility: 85 }
  },
  bizon: {
    id: 'bizon', name: 'PP-BIZON', type: 'smg', slot: 'primary',
    damage: 18, rpm: 650, mag: 64, reserve: 128, reload: 2.4,
    spread: 0.028, range: 55, projectile: false, pellets: 1,
    color: '#444', icon: '🌀',
    stats: { dmg: 38, firerate: 65, range: 50, mobility: 80 }
  },
  uzi: {
    id: 'uzi', name: 'UZI', type: 'smg', slot: 'primary',
    damage: 19, rpm: 900, mag: 32, reserve: 128, reload: 1.5,
    spread: 0.035, range: 45, projectile: false, pellets: 1,
    color: '#111', icon: '🔥',
    stats: { dmg: 42, firerate: 90, range: 40, mobility: 88 }
  },
  shotgun: {
    id: 'shotgun', name: 'M1014', type: 'shotgun', slot: 'primary',
    damage: 12, rpm: 200, mag: 8, reserve: 32, reload: 0.6, reloadPerShell: true,
    spread: 0.12, range: 20, projectile: false, pellets: 8,
    color: '#222', icon: '💣',
    stats: { dmg: 90, firerate: 20, range: 20, mobility: 60 }
  },
  rpg: {
    id: 'rpg', name: 'RPG-7', type: 'launcher', slot: 'primary',
    damage: 100, rpm: 60, mag: 1, reserve: 4, reload: 2.5,
    spread: 0, range: 200, projectile: true, projectileSpeed: 25, radius: 6, pellets: 1,
    color: '#5A3A1A', icon: '🚀',
    stats: { dmg: 100, firerate: 10, range: 90, mobility: 40 }
  },
  bow: {
    id: 'bow', name: 'COMPOUND BOW', type: 'bow', slot: 'primary',
    damage: 75, rpm: 90, mag: 1, reserve: 20, reload: 0.8,
    spread: 0.005, range: 150, projectile: true, projectileSpeed: 45, pellets: 1,
    color: '#3A2A1A', icon: '🏹',
    stats: { dmg: 80, firerate: 15, range: 95, mobility: 85 }
  }
};

export const ARROW_TYPES = {
  standard: { id: 'standard', name: 'STANDARD', damage: 75, color: '#DDD', effect: null, icon: '➤' },
  fire: { id: 'fire', name: 'FIRE', damage: 65, color: '#FF4D00', effect: 'burn', dot: 5, duration: 3, icon: '🔥' },
  explosive: { id: 'explosive', name: 'EXPLOSIVE', damage: 90, color: '#FF0000', effect: 'explode', radius: 4, icon: '💥' },
  poison: { id: 'poison', name: 'POISON', damage: 40, color: '#00FF00', effect: 'poison', dot: 8, duration: 5, icon: '☠️' },
  ice: { id: 'ice', name: 'ICE', damage: 50, color: '#00D5FF', effect: 'slow', slow: 0.4, duration: 2.5, icon: '❄️' },
  electric: { id: 'electric', name: 'ELECTRIC', damage: 55, color: '#FFD000', effect: 'stun', stun: 0.8, chain: 2, icon: '⚡' },
};

export const THROWABLES = {
  grenade: { id: 'grenade', name: 'FRAG GRENADE', damage: 80, radius: 6, fuse: 2.5, count: 2, icon: '💣', color: '#444' },
  molly: { id: 'molly', name: 'MOLOTOV', damage: 15, radius: 4, duration: 5, dot: true, count: 1, icon: '🔥', color: '#FF4D00' },
  smoke: { id: 'smoke', name: 'SMOKE', damage: 0, radius: 7, duration: 8, count: 1, icon: '💨', color: '#AAA' },
  medkit: { id: 'medkit', name: 'MEDKIT', heal: 50, count: 2, icon: '❤️', color: '#FF0000' }
};

export const MAPS = {
  warehouse: {
    id: 'warehouse', name: 'WAREHOUSE', size: 60,
    spawnPoints: [[-20,0,-15],[20,0,15],[-20,0,15],[20,0,-15],[0,0,25],[0,0,-25]],
    obstacles: [
      { pos: [0,0,0], size: [12,4,2], color: '#555' },
      { pos: [-12,0,8], size: [2,3,10], color: '#666' },
      { pos: [12,0,-8], size: [2,3,10], color: '#666' },
      { pos: [0,0,12], size: [20,2,2], color: '#777' },
      { pos: [0,0,-12], size: [20,2,2], color: '#777' },
      { pos: [-18,0,0], size: [2,5,12], color: '#444' },
      { pos: [18,0,0], size: [2,5,12], color: '#444' },
    ]
  },
  rooftop: {
    id: 'rooftop', name: 'ROOFTOP', size: 70,
    spawnPoints: [[-25,5,-20],[25,5,20],[-25,5,20],[25,5,-20],[0,8,0],[0,5,28]],
    obstacles: [
      { pos: [0,2,0], size: [30,4,30], color: '#666' },
      { pos: [-15,6,0], size: [4,4,12], color: '#555' },
      { pos: [15,6,0], size: [4,4,12], color: '#555' },
      { pos: [0,6,15], size: [12,4,4], color: '#777' },
      { pos: [0,6,-15], size: [12,4,4], color: '#777' },
      { pos: [-20,4,20], size: [3,6,3], color: '#444' },
      { pos: [20,4,-20], size: [3,6,3], color: '#444' },
      { pos: [0,10,0], size: [2,8,20], color: '#333' },
    ]
  },
  trainyard: {
    id: 'trainyard', name: 'TRAINYARD', size: 90,
    spawnPoints: [[-35,0,-10],[35,0,10],[-35,0,10],[35,0,-10],[0,0,30],[0,0,-30]],
    obstacles: [
      { pos: [-20,1,0], size: [6,3,40], color: '#8B0000' },
      { pos: [20,1,0], size: [6,3,40], color: '#1A3A5A' },
      { pos: [0,0,0], size: [40,0.5,4], color: '#222' },
      { pos: [-10,0,15], size: [3,2,3], color: '#555' },
      { pos: [10,0,-15], size: [3,2,3], color: '#555' },
      { pos: [-30,0,0], size: [4,4,8], color: '#666' },
      { pos: [30,0,0], size: [4,4,8], color: '#666' },
    ]
  }
};

export const GAME_MODES = {
  ffa: { name: 'FREE FOR ALL', maxKills: 20, time: 300 },
  tdm: { name: 'TEAM DEATHMATCH', maxKills: 30, time: 360 },
  gungame: { name: 'GUN GAME', maxKills: 14, time: 420 },
  arrow: { name: 'ARROW ONLY', maxKills: 15, time: 300 }
};

export const GUN_GAME_ORDER = ['glock','uzi','bizon','mp7','shotgun','m4','ak','bow','rpg'];
