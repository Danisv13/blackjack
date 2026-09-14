'use strict';

const game = new Blackjack.Game();
const byId = id => document.getElementById(id);
let countdown = null;
let deadline = 0;
let timeRemaining = 60;

function stopCountdown() {
  if (countdown !== null) clearInterval(countdown);
  countdown = null;
}
function checkDeadline() {
  if (!deadline || game.phase !== 'player') return false;
  timeRemaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
  if (timeRemaining > 0) return false;
  game.expire();
  stopCountdown();
  return true;
}
function startCountdown() {
  stopCountdown();
  deadline = 0;
  timeRemaining = 60;
  if (!byId('timed-mode').checked || game.phase !== 'player') return;
  deadline = Date.now() + 60000;
  countdown = setInterval(() => { checkDeadline(); render(); }, 250);
}
function deal() {
  if (!game.deal()) return;
  startCountdown();
  render();
}
function act(action) {
  if (!checkDeadline()) game[action]();
  if (game.phase === 'finished') stopCountdown();
  render();
}
function displayHand(hand, id, hidden) {
  const container = byId(id);
  container.replaceChildren();
  const symbols = { Corazones: '♥', Diamantes: '♦', Tréboles: '♣', Picas: '♠' };
  hand.forEach((card, index) => {
    const element = document.createElement('div');
    if (hidden && index === 1) {
      element.className = 'card card-back';
      element.textContent = '?';
      element.setAttribute('aria-label', 'Carta oculta');
    } else {
      element.className = 'card' + (['Corazones', 'Diamantes'].includes(card.suit) ? ' red' : '');
      element.textContent = `${card.rank} ${symbols[card.suit]}`;
      element.setAttribute('aria-label', `${card.rank} de ${card.suit}`);
    }
    container.appendChild(element);
  });
}
function render() {
  const active = game.phase === 'player';
  displayHand(game.player, 'player-cards', false);
  displayHand(game.dealer, 'dealer-cards', active);
  byId('player-score').textContent = `Puntuación: ${Blackjack.score(game.player)}`;
  byId('dealer-score').textContent = active ? `Carta visible: ${Blackjack.score(game.dealer.slice(0, 1))}` : `Puntuación: ${Blackjack.score(game.dealer)}`;
  byId('deal').disabled = active || game.rounds >= 3;
  byId('deal').textContent = game.rounds ? 'Siguiente mano' : 'Repartir';
  byId('hit').disabled = !active;
  byId('stand').disabled = !active;
  byId('new-session').hidden = game.rounds < 3;
  byId('timed-mode').disabled = active;
  byId('time-remaining').textContent = byId('timed-mode').checked ? `Tiempo restante: ${timeRemaining} segundos` : 'Sin límite de tiempo';
  byId('rondas-ganadas').textContent = `Manos: ${game.rounds}/3 · Ganadas: ${game.wins} · Empates: ${game.draws}`;
  const outcomes = { win: '¡Has ganado!', loss: 'Has perdido.', push: 'Es un empate.' };
  const reasons = { blackjack: 'Blackjack inicial.', bust: 'Superaste 21.', 'dealer-bust': 'La banca superó 21.', timeout: 'Se acabó el tiempo.', score: 'Se comparan las puntuaciones.' };
  byId('game-result').textContent = game.result ? `${outcomes[game.result.outcome]} ${reasons[game.result.reason]}` : active ? 'Tu turno: pide carta o plántate.' : 'Pulsa Repartir para comenzar.';
  byId('session-result').textContent = game.rounds >= 3 ? `Sesión completada. ${game.wins >= 2 ? 'Has ganado la sesión.' : 'Necesitas dos victorias para ganar la sesión.'}` : '';
}
byId('deal').addEventListener('click', deal);
byId('hit').addEventListener('click', () => act('hit'));
byId('stand').addEventListener('click', () => act('stand'));
byId('timed-mode').addEventListener('change', render);
byId('new-session').addEventListener('click', () => {
  stopCountdown();
  deadline = 0;
  timeRemaining = 60;
  game.reset();
  render();
});
window.addEventListener('pagehide', stopCountdown);
window.addEventListener('pageshow', () => {
  checkDeadline();
  if (deadline && game.phase === 'player' && countdown === null) {
    countdown = setInterval(() => { checkDeadline(); render(); }, 250);
  }
  render();
});
document.addEventListener('visibilitychange', () => { checkDeadline(); render(); });

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
  try { localStorage.setItem('blackjack-volume', String(music.volume)); } catch { /* El juego funciona sin almacenamiento. */ }
});
render();
