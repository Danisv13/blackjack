const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const { Game, score } = require('../game');

function setup() {
  const elements = new Map();
  function element() { return { textContent: '', children: [], checked: false, disabled: false, hidden: false, value: '', listeners: {}, replaceChildren() { this.children = []; }, appendChild(child) { this.children.push(child); }, setAttribute() {}, addEventListener(event, fn) { this.listeners[event] = fn; } }; }
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  let now = 0, nextId = 0;
  const windowEvents = {};
  const timers = new Map();
  const context = vm.createContext({
    Blackjack: { score, Game: class extends Game { constructor() { super(() => ['10','10','10','8','5'].map(rank => ({ rank, suit: 'Picas' })).reverse()); } } },
    document: { getElementById: get, createElement: element, addEventListener() {} },
    window: { addEventListener(name, fn) { windowEvents[name] = fn; } },
    localStorage: { getItem() { return null; }, setItem() {} },
    Date: { now: () => now },
    setInterval(fn) { timers.set(++nextId, fn); return nextId; },
    clearInterval(id) { timers.delete(id); }
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../script.js'), 'utf8'), context);
  return { get, timers, windowEvents, run: code => vm.runInContext(code, context), advance: ms => { now += ms; } };
}
test('controles iniciales y carta de banca oculta hasta plantarse', () => {
  const ui = setup();
  assert.equal(ui.get('hit').disabled, true);
  ui.run('deal()');
  assert.equal(ui.get('deal').disabled, true);
  assert.equal(ui.get('dealer-cards').children[1].textContent, '?');
  assert.equal(ui.get('dealer-score').textContent, 'Carta visible: 10');
  ui.run("act('stand')");
  assert.notEqual(ui.get('dealer-cards').children[1].textContent, '?');
  assert.equal(ui.get('hit').disabled, true);
});
test('repartos repetidos no acumulan intervalos y el cierre los elimina', () => {
  const ui = setup(); ui.get('timed-mode').checked = true;
  ui.run('deal(); deal(); deal()');
  assert.equal(ui.timers.size, 1);
  ui.run("act('stand')");
  assert.equal(ui.timers.size, 0);
  ui.run('deal()');
  assert.equal(ui.timers.size, 1);
  assert.equal(ui.get('game-result').textContent, 'Tu turno: pide carta o plántate.');
});
test('el modo sin límite no crea temporizadores', () => {
  const ui = setup(); ui.run('deal()');
  assert.equal(ui.timers.size, 0);
});
test('el reloj usa tiempo real y rechaza acciones tras vencer sin tick previo', () => {
  const ui = setup(); ui.get('timed-mode').checked = true; ui.run('deal()');
  ui.advance(61000); ui.run("act('stand')");
  assert.equal(ui.run('game.result.reason'), 'timeout');
  assert.equal(ui.run('game.rounds'), 1);
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.get('time-remaining').textContent, 'Tiempo restante: 0 segundos');
});
test('el intervalo cierra una mano agotada una sola vez', () => {
  const ui = setup(); ui.get('timed-mode').checked = true; ui.run('deal()');
  const tick = [...ui.timers.values()][0];
  ui.advance(60000); tick(); tick();
  assert.equal(ui.run('game.rounds'), 1);
  assert.equal(ui.timers.size, 0);
});
test('volver con el historial reanuda el reloj sin regalar tiempo', () => {
  const ui = setup(); ui.get('timed-mode').checked = true; ui.run('deal()');
  ui.windowEvents.pagehide();
  assert.equal(ui.timers.size, 0);
  ui.advance(10000); ui.windowEvents.pageshow();
  assert.equal(ui.timers.size, 1);
  assert.equal(ui.get('time-remaining').textContent, 'Tiempo restante: 50 segundos');
  ui.windowEvents.pagehide(); ui.advance(60000); ui.windowEvents.pageshow();
  assert.equal(ui.timers.size, 0);
  assert.equal(ui.run('game.result.reason'), 'timeout');
});
