const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, score, createDeck } = require('../game');
const cards = ranks => ranks.map(rank => ({ rank, suit: 'Picas' }));
const rig = ranks => new Game(() => cards(ranks).reverse());

test('la baraja contiene 52 cartas únicas', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map(c => c.rank + c.suit)).size, 52);
});
test('ases múltiples y figuras', () => {
  for (const [hand, expected] of [[['A','A','9'],21],[['A','K'],21],[['A','A','K'],12],[['A','A','A','8'],21],[['K','Q','5'],25]]) assert.equal(score(cards(hand)), expected);
});
test('no admite acciones antes del reparto', () => {
  const game = new Game();
  assert.equal(game.hit(), false);
  assert.equal(game.stand(), false);
  assert.equal(game.expire(), false);
  assert.equal(game.rounds, 0);
});
test('un segundo reparto no cambia la mano activa', () => {
  const game = rig(['10','8','10','7']);
  game.deal();
  const hand = [...game.player];
  assert.equal(game.deal(), false);
  assert.deepEqual(game.player, hand);
});
test('una victoria no se puede cobrar dos veces', () => {
  const game = rig(['10','10','10','8']);
  game.deal(); game.stand(); game.stand(); game.hit(); game.expire();
  assert.equal(game.wins, 1);
  assert.equal(game.rounds, 1);
});
test('pasarse y luego plantarse conserva la derrota', () => {
  const game = rig(['K','Q','10','8','5']);
  game.deal(); game.hit(); game.stand();
  assert.deepEqual(game.result, { outcome: 'loss', reason: 'bust' });
  assert.equal(game.rounds, 1);
});
test('tres manos completan una sesión y el reinicio limpia los contadores', () => {
  const game = rig(['10','10','10','8']);
  for (let i = 0; i < 3; i++) { game.deal(); assert.equal(game.result, null); game.stand(); }
  assert.equal(game.rounds, 3);
  assert.equal(game.wins, 3);
  assert.equal(game.deal(), false);
  game.reset();
  assert.equal(game.rounds, 0);
  assert.equal(game.wins, 0);
  assert.equal(game.deal(), true);
});
test('blackjack inicial de jugador, banca y ambos', () => {
  for (const [hand, outcome] of [[['A','K','10','8'],'win'],[['10','8','A','K'],'loss'],[['A','Q','A','K'],'push']]) {
    const game = rig(hand); game.deal();
    assert.deepEqual(game.result, { outcome, reason: 'blackjack' });
    assert.equal(game.phase, 'finished');
  }
});
test('21 con más cartas termina el turno y un empate cuenta una mano', () => {
  const game = rig(['10','5','10','6','6','5']);
  game.deal(); game.hit();
  assert.equal(game.result.outcome, 'push');
  assert.equal(game.rounds, 1);
  assert.equal(game.draws, 1);
});
test('la banca se planta con 17 suave', () => {
  const game = rig(['10','8','A','6','K']);
  game.deal(); game.stand();
  assert.equal(game.dealer.length, 2);
  assert.equal(game.result.outcome, 'win');
});
test('la banca pide hasta 17 y puede pasarse', () => {
  const game = rig(['10','8','10','6','K']);
  game.deal(); game.stand();
  assert.deepEqual(game.result, { outcome: 'win', reason: 'dealer-bust' });
});
test('el vencimiento solo registra una derrota', () => {
  const game = rig(['10','8','10','7']);
  game.deal(); game.expire(); game.expire(); game.stand();
  assert.deepEqual(game.result, { outcome: 'loss', reason: 'timeout' });
  assert.equal(game.rounds, 1);
});
