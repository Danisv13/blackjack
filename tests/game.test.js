const { test } = require('node:test');
const assert = require('node:assert/strict');
const { Game, score, createDeck, parseWager } = require('../game');

function rig(ranks) {
  const factory = () => {
    const deck = createDeck();
    const chosen = ranks.map(rank => deck.splice(deck.findIndex(card => card.rank === rank), 1)[0]);
    return deck.concat(chosen.reverse());
  };
  return new Game(factory);
}
module.exports = { rig };

test('52 cartas únicas y puntuación de ases', () => {
  const deck = createDeck();
  assert.equal(deck.length, 52);
  assert.equal(new Set(deck.map(c => c.rank + c.suit)).size, 52);
  for (const [ranks, expected] of [[['A','A','9'],21],[['A','A','K'],12],[['A','K'],21],[['K','Q','5'],25]]) {
    assert.equal(score(ranks.map(rank => ({ rank }))), expected);
  }
});
test('conversión exacta de importes de teclado y rechazo de entradas inválidas', () => {
  for (const [input, expected] of [['10',1000],['0.01',1],['1,25',125],['5',500],[' 10.1 ',1010]]) assert.equal(parseWager(input), expected);
  for (const input of ['', '0', '-10', 'abc', 'Infinity', 'NaN', '1e2', '0.001', '1.234,56', '9007199254740992']) assert.equal(parseWager(input), null);
});
test('no hay acciones antes de apostar ni importes inválidos', () => {
  const game = rig(['10','8','10','7']);
  assert.equal(game.hit(), false); assert.equal(game.stand(), false);
  for (const amount of [undefined, null, 0, -1, NaN, Infinity, 0.1, 10001, '1000']) assert.equal(game.deal(amount), false);
  assert.equal(game.balance, 10000);
});
test('apuestas por debajo de diez, incluidos céntimos', () => {
  for (const amount of [1, 50, 500, 999]) {
    const game = rig(['10','8','10','7']);
    assert.equal(game.deal(amount), true);
    assert.equal(game.balance, 10000 - amount);
  }
});
test('descuento único y bloqueo de reparto durante la mano', () => {
  const game = rig(['10','8','10','7']);
  game.deal(1000);
  const cards = [...game.player];
  assert.equal(game.deal(1000), false);
  assert.equal(game.balance, 9000); assert.equal(game.wager, 1000);
  assert.deepEqual(game.player, cards);
});
test('victoria normal devuelve apuesta más ganancia 1:1 una sola vez', () => {
  const game = rig(['10','10','10','8']);
  game.deal(1000); game.stand(); game.stand(); game.hit();
  assert.equal(game.balance, 11000);
  assert.deepEqual(game.result, { outcome:'win', reason:'score', wager:1000, payout:2000, net:1000, refill:0 });
  assert.equal(game.wager, 0);
});
test('blackjack devuelve apuesta más ganancia 3:2; empate devuelve apuesta', () => {
  for (const [hand, outcome, balance, payout] of [
    [['A','K','10','8'],'win',11500,2500],
    [['10','8','A','K'],'loss',9000,0],
    [['A','Q','A','K'],'push',10000,1000],
  ]) {
    const game = rig(hand); game.deal(1000);
    assert.equal(game.result.reason, 'blackjack');
    assert.equal(game.result.outcome, outcome);
    assert.equal(game.balance, balance);
    assert.equal(game.result.payout, payout);
    game.stand(); assert.equal(game.balance, balance);
  }
});
test('pago fraccionario redondeado al céntimo más cercano', () => {
  const game = rig(['A','K','10','8']);
  game.deal(1);
  assert.equal(game.result.payout, 3); assert.equal(game.balance, 10002);
});
test('pasarse y luego plantarse conserva la pérdida', () => {
  const game = rig(['K','Q','10','8','5']);
  game.deal(1000); game.hit(); game.stand();
  assert.equal(game.result.reason, 'bust'); assert.equal(game.result.outcome, 'loss');
  assert.equal(game.balance, 9000);
});
test('21 con tres cartas no paga blackjack; banca juega automáticamente', () => {
  const game = rig(['10','5','10','8','6']);
  game.deal(1000); game.hit();
  assert.equal(game.result.outcome, 'win');
  assert.equal(game.result.payout, 2000);
});
test('empate de puntuación devuelve la apuesta', () => {
  const game = rig(['10','8','K','8']);
  game.deal(250); game.stand();
  assert.equal(game.result.outcome, 'push'); assert.equal(game.balance, 10000);
});
test('banca se planta en 17 suave y pide por debajo de 17', () => {
  const soft = rig(['10','8','A','6']); soft.deal(1000); soft.stand();
  assert.equal(soft.dealer.length, 2);
  const bust = rig(['10','8','10','6','K']); bust.deal(1000); bust.stand();
  assert.equal(bust.result.reason, 'dealer-bust'); assert.equal(bust.balance, 11000);
});
test('apostar todo no recarga durante la mano; perder repone una sola vez', () => {
  const game = rig(['10','7','10','8']);
  game.deal(10000);
  assert.equal(game.balance, 0); assert.equal(game.phase, 'player');
  game.stand();
  assert.equal(game.balance, 10000); assert.equal(game.result.refill, 10000);
  assert.equal(game.result.net, -10000);
  game.stand(); game.hit(); assert.equal(game.balance, 10000);
});
test('apostar todo y ganar o empatar no concede recarga', () => {
  for (const hand of [['10','10','10','8'], ['10','8','K','8'], ['A','K','10','8']]) {
    const game = rig(hand); game.deal(10000); game.stand();
    assert.equal(game.result.refill, 0);
  }
});
test('saldo inferior a diez sigue disponible sin recarga', () => {
  const game = rig(['10','7','10','8']); game.deal(9500); game.stand();
  assert.equal(game.balance, 500); assert.equal(game.result.refill, 0);
  assert.equal(game.deal(500), true);
});
test('juego continuo sin límite de tres manos', () => {
  const game = rig(['10','10','10','8']);
  for (let i = 0; i < 8; i++) { assert.equal(game.deal(1000), true); assert.equal(game.result, null); game.stand(); }
  assert.equal(game.balance, 18000);
  assert.equal('rounds' in game, false);
  assert.equal(typeof game.expire, 'undefined');
});
test('recuperar mano en curso conserva cartas, apuesta y saldo cero', () => {
  const game = rig(['10','7','10','8']); game.deal(10000);
  const restored = Game.restore(game.snapshot());
  assert.deepEqual(restored.snapshot(), game.snapshot());
  restored.stand();
  assert.equal(restored.balance, 10000); assert.equal(restored.result.refill, 10000);
});
test('recuperar resultado no vuelve a liquidar ni a recargar', () => {
  const game = rig(['10','7','10','8']); game.deal(10000); game.stand();
  const restored = Game.restore(game.snapshot()); restored.stand();
  assert.deepEqual(restored.snapshot(), game.snapshot());
});
test('rechaza guardados corruptos, saldos inválidos y cartas duplicadas', () => {
  for (const value of [null, {}, {version:99}, {...new Game().snapshot(), balance:-1}, {...new Game().snapshot(), balance:NaN}]) assert.throws(() => Game.restore(value));
  const game = rig(['10','7','10','8']); game.deal(1000);
  const data = game.snapshot(); data.dealer[0] = data.player[0];
  assert.throws(() => Game.restore(data));
});
test('el snapshot no comparte referencias con la partida', () => {
  const game = rig(['10','7','10','8']); game.deal(1000);
  const saved = game.snapshot(); saved.player[0].rank = 'A';
  assert.equal(game.player[0].rank, '10');
});
