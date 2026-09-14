const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const Blackjack = require('../game');
const key = 'blackjack-table-v1';

function setup(store = new Map(), ranks = ['10','10','10','8','5'], fail = false) {
  const elements = new Map(), events = {};
  function element() { return { textContent:'', children:[], attrs:{}, disabled:false, value:'', listeners:{}, replaceChildren() { this.children = []; }, appendChild(c) { this.children.push(c); }, setAttribute(k,v) { this.attrs[k] = v; }, addEventListener(k,fn) { this.listeners[k] = fn; } }; }
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  get('bet-amount').value = '10';
  const factory = () => {
    const deck = Blackjack.createDeck();
    const chosen = ranks.map(rank => deck.splice(deck.findIndex(c => c.rank === rank),1)[0]);
    return deck.concat(chosen.reverse());
  };
  const context = vm.createContext({
    Blackjack: { ...Blackjack, Game: class extends Blackjack.Game { constructor() { super(factory); } } },
    document: { getElementById:get, createElement:element },
    window: { addEventListener(k,fn) { events[k] = fn; } },
    localStorage: { getItem(k) { if (fail) throw Error('blocked'); return store.get(k) ?? null; }, setItem(k,v) { if (fail) throw Error('blocked'); store.set(k,v); } }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../script.js'),'utf8'), context);
  return { get, events, store, run: code => vm.runInContext(code,context) };
}
test('controles, descuento y carta oculta', () => {
  const ui = setup();
  assert.equal(ui.get('hit').disabled, true);
  ui.run('deal()');
  assert.equal(ui.get('deal').disabled, true);
  assert.equal(ui.get('bet-amount').disabled, true);
  assert.equal(ui.get('wallet-balance').textContent, '90,00');
  assert.equal(ui.get('dealer-cards').children[1].attrs['aria-label'], 'Carta oculta');
  ui.run("act('stand')");
  assert.equal(ui.get('wallet-balance').textContent, '110,00');
  assert.equal(ui.get('hit').disabled, true);
  assert.equal(ui.get('bet-amount').disabled, false);
});
test('errores de apuesta no descuentan saldo ni reparten', () => {
  const ui = setup();
  for (const value of ['', '0', '-1', '101', '0.001', 'texto']) {
    ui.get('bet-amount').value = value; ui.run('deal()');
    assert.equal(ui.run('game.balance'), 10000);
    assert.equal(ui.run('game.phase'), 'idle');
    assert.match(ui.get('bet-error').textContent, /importe positivo/);
  }
});
test('apuesta por teclado inferior a diez y liquidación única', () => {
  const ui = setup(); ui.get('bet-amount').value = '1.25';
  ui.get('bet-form').listeners.submit({ preventDefault() {} });
  ui.run("act('stand'); act('stand')");
  assert.equal(ui.get('wallet-balance').textContent, '101,25');
  assert.match(ui.get('payout-detail').textContent, /2,50/);
});
test('recarga de página conserva mano activa y apuesta', () => {
  const ui = setup(); ui.get('bet-amount').value = '5'; ui.run('deal()');
  const reloaded = setup(ui.store);
  assert.equal(reloaded.run('game.phase'), 'player');
  assert.equal(reloaded.run('game.balance'), 9500);
  assert.equal(reloaded.run('game.wager'), 500);
  assert.equal(reloaded.get('bet-amount').value, '5.00');
  assert.equal(reloaded.get('dealer-cards').children[1].attrs['aria-label'], 'Carta oculta');
  reloaded.run("act('stand')");
  assert.equal(reloaded.run('game.balance'), 10500);
  const again = setup(ui.store); again.run("act('stand')");
  assert.equal(again.run('game.balance'), 10500);
});
test('recarga a 100 visible y persistida solo después de perder todo', () => {
  const ui = setup(new Map(), ['10','7','10','8']); ui.get('bet-amount').value = '100'; ui.run('deal()');
  assert.equal(ui.get('wallet-balance').textContent, '0,00');
  assert.equal(ui.get('refill-message').textContent, '');
  ui.run("act('stand')");
  assert.equal(ui.get('wallet-balance').textContent, '100,00');
  assert.match(ui.get('refill-message').textContent, /Recibes 100/);
  const again = setup(ui.store); assert.equal(again.run('game.balance'), 10000);
});
test('guardado dañado se recupera con aviso y nuevo monedero', () => {
  const ui = setup(new Map([[key,'{broken']]));
  assert.equal(ui.run('game.balance'), 10000);
  assert.match(ui.get('storage-status').textContent, /No se pudo recuperar/);
  assert.doesNotThrow(() => Blackjack.Game.restore(JSON.parse(ui.store.get(key))));
});
test('sin almacenamiento se puede seguir jugando y se muestra aviso', () => {
  const ui = setup(new Map(), undefined, true); ui.run('deal()'); ui.run("act('stand')");
  assert.equal(ui.run('game.balance'), 11000);
  assert.match(ui.get('storage-status').textContent, /no permite guardar/);
});
test('una pestaña desactualizada recoge la partida antes de aceptar acciones', () => {
  const store = new Map(); const first = setup(store); const second = setup(store);
  first.run('deal()'); second.run('deal()');
  assert.equal(second.run('game.balance'), 9000);
  assert.equal(second.run('game.wager'), 1000);
  first.run("act('stand')"); second.run("act('stand')");
  assert.equal(second.run('game.balance'), 11000);
});
test('ya no hay reloj ni contadores en la página', () => {
  const html = fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
  assert.doesNotMatch(html, /id="(?:time-remaining|timed-mode|rondas-ganadas|new-session|session-result)"/);
  assert.match(html, /inputmode="decimal"/);
});
