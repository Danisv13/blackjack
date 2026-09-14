'use strict';

const byId = id => document.getElementById(id);
const saveKey = 'blackjack-table-v1';
let game = new Blackjack.Game();
let savedValue = null;
let storageAvailable = true;
const format = cents => (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function loadGame() {
  try {
    savedValue = localStorage.getItem(saveKey);
    if (savedValue !== null) game = Blackjack.Game.restore(JSON.parse(savedValue));
  } catch {
    if (savedValue !== null) {
      game = new Blackjack.Game();
      byId('storage-status').textContent = 'No se pudo recuperar la partida guardada. Empiezas con 100 monedas.';
    } else {
      storageAvailable = false;
      byId('storage-status').textContent = 'El navegador no permite guardar. El saldo solo se conservará mientras esta página esté abierta.';
    }
  }
}
function saveGame() {
  if (!storageAvailable) return;
  try {
    const value = JSON.stringify(game.snapshot());
    localStorage.setItem(saveKey, value);
    savedValue = value;
  } catch {
    storageAvailable = false;
    byId('storage-status').textContent = 'No se puede guardar el progreso. Mantén esta página abierta para conservar esta partida.';
  }
}
function syncGame() {
  if (!storageAvailable) return false;
  try {
    const value = localStorage.getItem(saveKey);
    if (value === savedValue) return false;
    game = value === null ? new Blackjack.Game() : Blackjack.Game.restore(JSON.parse(value));
    savedValue = value;
    byId('storage-status').textContent = 'Partida actualizada desde otra pestaña. Comprueba la mano antes de continuar.';
    render();
    return true;
  } catch {
    storageAvailable = false;
    byId('storage-status').textContent = 'No se pudo sincronizar la partida. Usa una sola pestaña; los cambios actuales no se guardarán.';
    return false;
  }
}
function deal() {
  if (syncGame()) return;
  const wager = Blackjack.parseWager(byId('bet-amount').value);
  if (wager === null || wager > game.balance) {
    byId('bet-error').textContent = 'Introduce un importe positivo, con hasta dos decimales y dentro de tu saldo.';
    return;
  }
  if (!game.deal(wager)) return;
  byId('bet-error').textContent = '';
  saveGame();
  render();
}
function act(action) {
  if (syncGame()) return;
  if (!game[action]()) return;
  saveGame();
  render();
}
function displayHand(hand, id, hidden) {
  const container = byId(id);
  container.replaceChildren();
  const symbols = { Corazones: '♥', Diamantes: '♦', Tréboles: '♣', Picas: '♠' };
  hand.forEach((card, index) => {
    const element = document.createElement('div');
    element.setAttribute('role', 'img');
    if (hidden && index === 1) {
      element.className = 'card card-back';
      element.setAttribute('aria-label', 'Carta oculta');
    } else {
      element.className = 'card' + (['Corazones', 'Diamantes'].includes(card.suit) ? ' red' : '');
      element.setAttribute('aria-label', card.rank + ' de ' + card.suit);
      for (const className of ['corner', 'suit', 'corner bottom']) {
        const part = document.createElement('span');
        part.className = className;
        part.textContent = className === 'suit' ? symbols[card.suit] : card.rank + symbols[card.suit];
        part.setAttribute('aria-hidden', 'true');
        element.appendChild(part);
      }
    }
    container.appendChild(element);
  });
}
function render() {
  const active = game.phase === 'player';
  displayHand(game.player, 'player-cards', false);
  displayHand(game.dealer, 'dealer-cards', active);
  byId('player-score').textContent = game.player.length ? Blackjack.score(game.player) + ' puntos' : 'Esperando reparto';
  byId('dealer-score').textContent = active ? Blackjack.score(game.dealer.slice(0, 1)) + ' visibles' : game.dealer.length ? Blackjack.score(game.dealer) + ' puntos' : 'La banca se planta en 17';
  byId('wallet-balance').textContent = format(game.balance);
  byId('wallet-euros').textContent = 'Equivalencia ficticia: ' + format(game.balance) + ' €';
  byId('table-bet').textContent = format(game.wager || (game.result ? game.result.wager : 0)) + ' monedas';
  byId('bet-caption').textContent = active ? 'En juego' : game.result ? 'Última apuesta' : 'Tu apuesta';
  byId('bet-amount').disabled = active;
  if (active) byId('bet-amount').value = (game.wager / 100).toFixed(2);
  byId('bet-amount').max = (game.balance / 100).toFixed(2);
  byId('deal').disabled = active;
  byId('deal').textContent = active ? 'Apuesta en juego' : 'Apostar y repartir';
  byId('hit').disabled = !active;
  byId('stand').disabled = !active;
  const r = game.result;
  const outcomes = { win: 'Has ganado', loss: 'Has perdido', push: 'Empate' };
  const reasons = { blackjack: 'Blackjack inicial.', bust: 'Tu mano supera 21.', 'dealer-bust': 'La banca supera 21.', score: 'Resultado por puntuación.' };
  byId('result-title').textContent = r ? outcomes[r.outcome] : active ? 'Tu turno' : 'La mesa está lista';
  byId('game-result').textContent = r ? reasons[r.reason] + ' ' + (r.outcome === 'win' ? 'Ganancia: +' + format(r.net) + ' monedas.' : r.outcome === 'push' ? 'Recuperas tu apuesta.' : 'Pérdida: ' + format(-r.net) + ' monedas.') : active ? 'Pide una carta o plántate cuando quieras.' : 'Elige cuánto apostar y recibe tus cartas.';
  byId('payout-detail').textContent = r ? 'Devuelto al monedero: ' + format(r.payout) + ' monedas' + (r.payout ? ' (incluye la apuesta)' : '') + '.' : '';
  byId('refill-message').textContent = r && r.refill ? 'Te has quedado sin saldo. Recibes 100 monedas para volver a jugar.' : '';
  byId('result-panel').setAttribute('data-outcome', r ? r.outcome : 'idle');
}
byId('bet-form').addEventListener('submit', event => { event.preventDefault(); deal(); });
byId('bet-amount').addEventListener('input', () => { byId('bet-error').textContent = ''; });
byId('hit').addEventListener('click', () => act('hit'));
byId('stand').addEventListener('click', () => act('stand'));
window.addEventListener('storage', event => { if (event.key === saveKey || event.key === null) syncGame(); });
window.addEventListener('pageshow', () => { syncGame(); render(); });

const music = byId('musica1');
const musicButton = byId('music-toggle');
try { music.volume = Math.min(1, Math.max(0, Number(localStorage.getItem('blackjack-volume') ?? 0.3) || 0)); } catch { music.volume = 0.3; }
byId('volume').value = music.volume;
musicButton.addEventListener('click', async () => {
  if (!music.paused) music.pause();
  else {
    try { await music.play(); } catch { byId('audio-status').textContent = 'No se pudo reproducir la música.'; return; }
  }
  byId('audio-status').textContent = '';
  musicButton.textContent = music.paused ? 'Activar música' : 'Pausar música';
  musicButton.setAttribute('aria-pressed', String(!music.paused));
});
byId('volume').addEventListener('input', event => {
  music.volume = Number(event.target.value);
  try { localStorage.setItem('blackjack-volume', String(music.volume)); } catch { /* La música funciona sin almacenamiento. */ }
});
loadGame();
saveGame();
render();
