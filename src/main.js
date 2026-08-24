import { Game } from './core/Game.js';
import { Multiplayer } from './core/Multiplayer.js';
import { UIManager } from './ui/UIManager.js';

const canvas = document.getElementById('gameCanvas');
const multiplayer = new Multiplayer();
const uiPlaceholder = { showHUD:()=>{}, updateHUD:()=>{} }; // temp

// Create game with dummy UI first, then real UI
let game = null;
let ui = null;

function init(){
  game = new Game(canvas, null, multiplayer);
  ui = new UIManager(game);
  game.ui = ui;

  // Expose for debugging
  window.GAME = game;
  window.MULTI = multiplayer;
  window.UI = ui;

  console.log('SHANK ARENA initialized - Comic style 3D shooter');
  console.log('Features: P2P multiplayer via Trystero torrent, 3 maps, 9 guns, 6 arrow types, grenades, gun game');
}

init();

// Prevent context menu on right click for aiming
canvas.addEventListener('contextmenu', e=>e.preventDefault());

// Service worker for Netlify offline? Not needed

// Auto show profile
// Already visible via HTML
