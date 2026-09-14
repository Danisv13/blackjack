'use strict';

// Motor independiente de la interfaz y del reloj.
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
      this.reset();
    }
    reset() {
      this.phase = 'idle';
      this.deck = [];
      this.player = [];
      this.dealer = [];
      this.result = null;
      this.rounds = 0;
      this.wins = 0;
      this.draws = 0;
    }
    deal() {
      if (this.phase === 'player' || this.phase === 'dealer' || this.rounds >= 3) return false;
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
    expire() {
      if (this.phase !== 'player') return false;
      return this.finish('loss', 'timeout');
    }
    finish(outcome, reason) {
      if (this.phase !== 'player' && this.phase !== 'dealer') return false;
      this.phase = 'finished';
      this.result = { outcome, reason };
      this.rounds++;
      if (outcome === 'win') this.wins++;
      if (outcome === 'push') this.draws++;
      return true;
    }
  }
  return { Game, score, createDeck };
})();
if (typeof module !== 'undefined') module.exports = Blackjack;
