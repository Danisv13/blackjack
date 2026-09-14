'use strict';

// Motor independiente de la interfaz. Importes en céntimos de moneda ficticia.
const Blackjack = (() => {
  const suits = ['Corazones', 'Diamantes', 'Tréboles', 'Picas'];
  const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  function score(hand) {
    let total = hand.reduce((sum, card) => sum + (card.rank === 'A' ? 1 : ['J', 'Q', 'K'].includes(card.rank) ? 10 : Number(card.rank)), 0);
    if (hand.some(card => card.rank === 'A') && total + 10 <= 21) total += 10;
    return total;
  }
  function createDeck() {
    const deck = suits.flatMap(suit => ranks.map(rank => ({ suit, rank })));
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }
  class Game {
    constructor(deckFactory = createDeck) {
      this.deckFactory = deckFactory;
      this.phase = 'idle';
      this.deck = [];
      this.player = [];
      this.dealer = [];
      this.result = null;
      this.balance = 10000;
      this.wager = 0;
    }
    deal(wager) {
      if (this.phase === 'player' || this.phase === 'dealer') return false;
      if (!Number.isSafeInteger(wager) || wager <= 0 || wager > this.balance) return false;
      this.balance -= wager;
      this.wager = wager;
      this.deck = this.deckFactory();
      this.player = [this.deck.pop(), this.deck.pop()];
      this.dealer = [this.deck.pop(), this.deck.pop()];
      this.result = null;
      this.phase = 'player';
      const playerNatural = score(this.player) === 21;
      const dealerNatural = score(this.dealer) === 21;
      if (playerNatural || dealerNatural) {
        this.finish(playerNatural && dealerNatural ? 'push' : playerNatural ? 'win' : 'loss', 'blackjack');
      }
      return true;
    }
    hit() {
      if (this.phase !== 'player') return false;
      this.player.push(this.deck.pop());
      if (score(this.player) > 21) this.finish('loss', 'bust');
      else if (score(this.player) === 21) this.stand();
      return true;
    }
    stand() {
      if (this.phase !== 'player') return false;
      this.phase = 'dealer';
      while (score(this.dealer) < 17) this.dealer.push(this.deck.pop());
      const player = score(this.player);
      const dealer = score(this.dealer);
      this.finish(player > 21 ? 'loss' : dealer > 21 || player > dealer ? 'win' : player < dealer ? 'loss' : 'push', dealer > 21 ? 'dealer-bust' : 'score');
      return true;
    }
    snapshot() {
      return JSON.parse(JSON.stringify({ version: 1, phase: this.phase, deck: this.deck, player: this.player, dealer: this.dealer, balance: this.balance, wager: this.wager, result: this.result }));
    }
    static restore(data, deckFactory = createDeck) {
      if (!data || data.version !== 1 || !['idle', 'player', 'finished'].includes(data.phase)) throw new Error('Partida guardada no válida.');
      const money = value => Number.isSafeInteger(value) && value >= 0;
      if (!money(data.balance) || !money(data.wager)) throw new Error('Saldo guardado no válido.');
      if (![data.deck, data.player, data.dealer].every(Array.isArray)) throw new Error('Cartas guardadas no válidas.');
      const all = [...data.deck, ...data.player, ...data.dealer];
      if (all.some(card => !card || !suits.includes(card.suit) || !ranks.includes(card.rank)) || new Set(all.map(card => card.rank + card.suit)).size !== all.length) throw new Error('Baraja guardada no válida.');
      if (data.phase === 'idle') {
        if (all.length || data.wager || data.result || !data.balance) throw new Error('Estado inicial no válido.');
      } else {
        if (all.length !== 52 || data.player.length < 2 || data.dealer.length < 2) throw new Error('Mano incompleta.');
        if (data.phase === 'player' && (!data.wager || data.result || data.dealer.length !== 2 || score(data.player) >= 21 || score(data.dealer) === 21)) throw new Error('Turno guardado no válido.');
        if (data.phase === 'finished') {
          const r = data.result;
          if (data.wager || !data.balance || !r || !['win', 'loss', 'push'].includes(r.outcome) || !['blackjack', 'bust', 'dealer-bust', 'score'].includes(r.reason) || !money(r.wager) || !r.wager || !money(r.payout) || r.net !== r.payout - r.wager || ![0, 10000].includes(r.refill)) throw new Error('Resultado guardado no válido.');
          const expected = r.outcome === 'loss' ? 0 : r.wager + (r.outcome === 'win' ? (r.reason === 'blackjack' ? Math.round(r.wager * 1.5) : r.wager) : 0);
          if (r.payout !== expected) throw new Error('Pago guardado no válido.');
        }
      }
      const game = new Game(deckFactory);
      const copy = JSON.parse(JSON.stringify(data));
      for (const key of ['phase', 'deck', 'player', 'dealer', 'balance', 'wager', 'result']) game[key] = copy[key];
      return game;
    }
    finish(outcome, reason) {
      if (this.phase !== 'player' && this.phase !== 'dealer') return false;
      this.phase = 'finished';
      const profit = outcome === 'win' ? (reason === 'blackjack' ? Math.round(this.wager * 1.5) : this.wager) : 0;
      const payout = outcome === 'loss' ? 0 : this.wager + profit;
      this.balance += payout;
      const refill = this.balance === 0 ? 10000 : 0;
      this.balance += refill;
      this.result = { outcome, reason, wager: this.wager, payout, net: payout - this.wager, refill };
      this.wager = 0;
      return true;
    }
  }
  function parseWager(value) {
    const text = String(value).trim().replace(',', '.');
    if (!/^\d+(?:\.\d{1,2})?$/.test(text)) return null;
    const [whole, fraction = ''] = text.split('.');
    const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
    return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
  }
  return { Game, score, createDeck, parseWager };
})();
if (typeof module !== 'undefined') module.exports = Blackjack;
