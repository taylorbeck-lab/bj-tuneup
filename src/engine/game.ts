/**
 * Blackjack table engine (pure, UI-independent). US peek game, one human seat plus basic-strategy
 * bots. The UI drives it one step at a time so dealing can be animated at the chosen speed.
 *
 * Every human decision is logged with the exact unseen composition at that moment, so the exact EV
 * analyzer can score it afterwards (coach, results, Feel Lab, hand review).
 */
import { type CardId, valueOf, handTotal, isBlackjack } from './cards';
import { Shoe, type Comp } from './shoe';
import type { Rules } from './rules';
import { canDoubleTotal } from './rules';
import { chartAction, type Action, type Avail, type Chart } from './strategy/chart';
import { hiLoCard, roundTc, estimateDecks, type Rounding } from './count';
import { mulberry32 } from './rng';

export interface Hand {
  cards: CardId[];
  bet: number;
  doubled: boolean;
  surrendered: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  done: boolean;
  /** Net result in units (set at settlement). */
  net?: number;
}

export interface Seat {
  human: boolean;
  hands: Hand[];
  /** Insurance stake (units). */
  insurance: number;
  /** Units of the initial bet. */
  baseBet: number;
}

export type Phase = 'bet' | 'deal' | 'insurance' | 'play' | 'dealer' | 'settled';

export interface DecisionSnapshot {
  round: number;
  /** Values of the hand's cards at the decision. */
  values: number[];
  cards: CardId[];
  up: number;
  upCard: CardId;
  /** Unseen composition (by value) from the player's view: remaining shoe + burn + dealer hole card. */
  unseen: Comp;
  rc: number;
  /** True count from cards seen, exact decks. */
  tcExact: number;
  /** True count as the player would compute it (settings granularity + rounding). */
  tc: number;
  avail: Avail;
  /** Hands already formed from this pair before this decision (1 = not split). */
  splitHands: number;
  chosen: Action;
  handIndex: number;
}

export interface InsuranceSnapshot {
  round: number;
  unseen: Comp;
  tc: number;
  tcExact: number;
  take: boolean;
  /** Player has blackjack (even money). */
  evenMoney: boolean;
}

export interface BetSnapshot {
  round: number;
  units: number;
  tc: number;
  tcExact: number;
  rc: number;
  /** Unseen composition before the deal. */
  unseen: Comp;
}

export interface RoundLog {
  round: number;
  bet: BetSnapshot;
  decisions: DecisionSnapshot[];
  insurance?: InsuranceSnapshot;
  /** Cards in deal order with destination: seat index or -1 dealer. */
  dealt: { card: CardId; who: number; hand: number }[];
  dealer: CardId[];
  playerHands: { cards: CardId[]; bet: number; net: number }[];
  /** Net units for the human seat this round, including insurance. */
  net: number;
  dealerBJ: boolean;
}

export interface TableOptions {
  rules: Rules;
  /** Number of seats (1..6) including the human. */
  seats: number;
  /** Human seat index, 0 = first base. */
  humanSeat: number;
  chart: Chart;
  seed?: number;
  granularity: number;
  rounding: Rounding;
  /** Hot shoes for Feel Lab (see Shoe.skew). */
  skew?: number;
  /** Human-controlled seats (V2: one or two spots). Defaults to [humanSeat]. */
  humanSeats?: number[];
  /** Bet placed by a bot seat each round (default 1). */
  botBet?: (seat: number) => number;
  /** Probability a bot misplays a stiff hard 12-16 (realistic tables). Default 0. */
  botMistakeRate?: number;
}

export class Table {
  readonly rules: Rules;
  readonly shoe: Shoe;
  readonly chart: Chart;
  readonly opts: TableOptions;
  seats: Seat[];
  dealer: CardId[] = [];
  holeRevealed = false;
  phase: Phase = 'bet';
  round = 0;
  /** Turn pointer during play. */
  turn = { seat: 0, hand: 0 };
  rc = 0;
  seenCount = 0;
  logs: RoundLog[] = [];
  current: RoundLog | null = null;
  private dealQueue: { who: number; hand: number }[] = [];
  /** True after a round in which the cut card came out; shoe is reshuffled before the next deal. */
  needsShuffle = false;
  shoesPlayed = 0;

  constructor(opts: TableOptions) {
    this.opts = opts;
    this.rules = opts.rules;
    this.chart = opts.chart;
    this.shoe = new Shoe(opts.rules.decks, opts.rules.penetration, opts.rules.burn, opts.seed, opts.skew ?? 0);
    const humans = opts.humanSeats ?? [opts.humanSeat];
    this.humanSeats = humans;
    this.seats = Array.from({ length: opts.seats }, (_, i) => ({ human: humans.includes(i), hands: [], insurance: 0, baseBet: 1 }));
    this.botRng = mulberry32((opts.seed ?? 1) ^ 0x9e3779b9);
  }

  readonly humanSeats: number[];
  private botRng: () => number;
  /** Human seats still to decide on insurance this round. */
  pendingInsurance: number[] = [];

  /** The first human seat (single-spot play). */
  get human(): Seat {
    return this.seats[this.humanSeats[0]];
  }
  get upCard(): CardId {
    return this.dealer[0];
  }

  /** Unseen composition from the player's point of view. */
  unseen(): Comp {
    const c = this.shoe.unseenByValue();
    if (this.dealer.length >= 2 && !this.holeRevealed) c[valueOf(this.dealer[1])]++;
    return c;
  }
  /** Unseen cards by physical card (side bets): remaining shoe + burn + unrevealed hole card. */
  unseenByCard(): number[] {
    const c = this.shoe.unseenByCard();
    if (this.dealer.length >= 2 && !this.holeRevealed) c[this.dealer[1]]++;
    return c;
  }
  unseenCount(): number {
    return this.shoe.remaining + this.shoe.burned.length + (this.dealer.length >= 2 && !this.holeRevealed ? 1 : 0);
  }
  tcExact(): number {
    return this.rc / Math.max(1 / 52, this.unseenCount() / 52);
  }
  tcPlayer(): number {
    return roundTc(this.rc / estimateDecks(this.unseenCount(), this.opts.granularity), this.opts.rounding);
  }

  private see(c: CardId): void {
    this.rc += hiLoCard(c);
    this.seenCount++;
  }

  /**
   * Start a round. `bets` is the human's bet (units or dollars) for a single spot, or a map
   * seat -> bet for several spots (a bet of 0 leaves that spot empty). Bots bet `botBet` (default 1).
   */
  placeBet(bets: number | Record<number, number>): void {
    if (this.phase !== 'bet' && this.phase !== 'settled') throw new Error('Not betting');
    if (this.needsShuffle) this.reshuffle();
    const humanBet = (i: number) => (typeof bets === 'number' ? (i === this.humanSeats[0] ? bets : 0) : bets[i] ?? 0);
    const units = typeof bets === 'number' ? bets : Object.values(bets).reduce((a, b) => a + b, 0);
    this.round++;
    this.dealer = [];
    this.holeRevealed = false;
    this.seats.forEach((s, i) => {
      s.baseBet = s.human ? humanBet(i) : (this.opts.botBet?.(i) ?? 1);
      s.insurance = 0;
      s.hands = s.baseBet > 0 ? [{ cards: [], bet: s.baseBet, doubled: false, surrendered: false, fromSplit: false, splitAces: false, done: false }] : [];
    });
    this.current = {
      round: this.round,
      bet: { round: this.round, units, tc: this.tcPlayer(), tcExact: this.tcExact(), rc: this.rc, unseen: this.unseen() },
      decisions: [],
      dealt: [],
      dealer: [],
      playerHands: [],
      net: 0,
      dealerBJ: false,
    };
    this.dealQueue = [];
    for (let r = 0; r < 2; r++) {
      for (let i = 0; i < this.seats.length; i++) if (this.seats[i].hands.length) this.dealQueue.push({ who: i, hand: 0 });
      this.dealQueue.push({ who: -1, hand: 0 });
    }
    this.phase = 'deal';
  }

  reshuffle(): void {
    this.shoe.shuffle();
    this.rc = 0;
    this.seenCount = 0;
    this.needsShuffle = false;
    this.shoesPlayed++;
  }

  private draw(who: number, hand: number): CardId {
    const c = this.shoe.draw();
    const hole = who === -1 && this.dealer.length === 1;
    if (!hole) this.see(c);
    this.current?.dealt.push({ card: c, who, hand });
    return c;
  }

  /** Is the game waiting for the human? */
  get waitingForHuman(): boolean {
    if (this.phase === 'insurance') return this.pendingInsurance.length > 0;
    if (this.phase === 'play') return this.seats[this.turn.seat]?.human ?? false;
    return this.phase === 'bet' || this.phase === 'settled';
  }

  /** Perform one automatic step (deal a card, a bot action, a dealer draw). Returns false if nothing to do. */
  step(): boolean {
    switch (this.phase) {
      case 'deal': {
        const t = this.dealQueue.shift();
        if (!t) return false;
        const c = this.draw(t.who, t.hand);
        if (t.who === -1) this.dealer.push(c);
        else this.seats[t.who].hands[0].cards.push(c);
        if (this.dealQueue.length === 0) this.afterDeal();
        return true;
      }
      case 'play': {
        const s = this.seats[this.turn.seat];
        if (!s) {
          this.phase = 'dealer';
          return true;
        }
        if (s.human) return false;
        const h = s.hands[this.turn.hand];
        const a = this.botAction(h, s);
        this.apply(a);
        return true;
      }
      case 'dealer':
        return this.dealerStep();
      default:
        return false;
    }
  }

  private afterDeal(): void {
    const up = valueOf(this.dealer[0]);
    this.pendingInsurance = up === 1 ? this.humanSeats.filter((i) => this.seats[i].hands.length > 0) : [];
    if (this.pendingInsurance.length) {
      this.phase = 'insurance';
      return;
    }
    this.peekAndContinue();
  }

  /** Human insurance decision for the next undecided spot (insurance stake = half the bet). */
  insure(take: boolean): void {
    if (this.phase !== 'insurance' || !this.pendingInsurance.length) throw new Error('No insurance offered');
    const seat = this.pendingInsurance.shift()!;
    const s = this.seats[seat];
    if (take) s.insurance = s.baseBet / 2;
    if (this.current && !this.current.insurance)
      this.current.insurance = {
        round: this.round,
        unseen: this.unseen(),
        tc: this.tcPlayer(),
        tcExact: this.tcExact(),
        take,
        evenMoney: isBlackjack(s.hands[0].cards.map(valueOf)),
      };
    if (!this.pendingInsurance.length) this.peekAndContinue();
  }

  private peekAndContinue(): void {
    const up = valueOf(this.dealer[0]);
    const dealerBJ = (up === 1 || up === 10) && isBlackjack(this.dealer.map(valueOf));
    if (dealerBJ) {
      this.revealHole();
      this.settle(true);
      return;
    }
    // Player blackjacks are paid at settlement; mark them done.
    for (const s of this.seats) {
      const h = s.hands[0];
      if (h && isBlackjack(h.cards.map(valueOf))) h.done = true;
    }
    this.phase = 'play';
    this.turn = { seat: 0, hand: 0 };
    this.advance();
  }

  private revealHole(): void {
    if (!this.holeRevealed) {
      this.holeRevealed = true;
      this.see(this.dealer[1]);
    }
  }

  /** Move the turn pointer to the next hand that needs a decision. */
  private advance(): void {
    for (;;) {
      const s = this.seats[this.turn.seat];
      if (!s) {
        this.phase = 'dealer';
        return;
      }
      const h = s.hands[this.turn.hand];
      if (!h) {
        this.turn = { seat: this.turn.seat + 1, hand: 0 };
        continue;
      }
      if (h.cards.length === 1) {
        // split hand waiting for its second card
        h.cards.push(this.draw(this.turn.seat, this.turn.hand));
        if (h.splitAces && !this.rules.hitSplitAces && !(valueOf(h.cards[1]) === 1 && this.canSplit(h, s))) h.done = true;
      }
      const t = handTotal(h.cards.map(valueOf));
      if (h.done || t.total >= 21) {
        h.done = true;
        this.turn = { seat: this.turn.seat, hand: this.turn.hand + 1 };
        continue;
      }
      return;
    }
  }

  canSplit(h: Hand, s: Seat): boolean {
    if (h.cards.length !== 2) return false;
    if (valueOf(h.cards[0]) !== valueOf(h.cards[1])) return false;
    if (s.hands.length >= this.rules.maxSplitHands) return false;
    if (h.splitAces && !this.rules.resplitAces) return false;
    return true;
  }

  availFor(h: Hand, s: Seat): Avail {
    const v = h.cards.map(valueOf);
    const t = handTotal(v);
    const two = h.cards.length === 2;
    const canDouble = two && (!h.fromSplit || this.rules.das) && canDoubleTotal(this.rules, t.total, t.soft) && !(h.splitAces && !this.rules.hitSplitAces);
    return {
      canDouble,
      canSplit: this.canSplit(h, s),
      canSurrender: two && !h.fromSplit && this.rules.lateSurrender,
    };
  }

  legalActions(): Action[] {
    if (this.phase !== 'play') return [];
    const s = this.seats[this.turn.seat];
    const h = s.hands[this.turn.hand];
    const a = this.availFor(h, s);
    const out: Action[] = [];
    if (!(h.splitAces && !this.rules.hitSplitAces)) out.push('hit');
    out.push('stand');
    if (a.canDouble) out.push('double');
    if (a.canSplit) out.push('split');
    if (a.canSurrender) out.push('surrender');
    return out;
  }

  private botAction(h: Hand, s: Seat): Action {
    const a = this.availFor(h, s);
    let act = chartAction(this.chart, h.cards.map(valueOf), valueOf(this.dealer[0]), a);
    const t = handTotal(h.cards.map(valueOf));
    if (!t.soft && t.total >= 12 && t.total <= 16 && (act === 'hit' || act === 'stand') && this.botRng() < (this.opts.botMistakeRate ?? 0)) act = act === 'hit' ? 'stand' : 'hit';
    return this.legalActions().includes(act) ? act : 'stand';
  }

  /** Human action. */
  act(a: Action): DecisionSnapshot {
    const s = this.seats[this.turn.seat];
    if (this.phase !== 'play' || !s.human) throw new Error('Not your turn');
    if (!this.legalActions().includes(a)) throw new Error('Illegal action ' + a);
    const h = s.hands[this.turn.hand];
    const snap: DecisionSnapshot = {
      round: this.round,
      values: h.cards.map(valueOf),
      cards: [...h.cards],
      up: valueOf(this.dealer[0]),
      upCard: this.dealer[0],
      unseen: this.unseen(),
      rc: this.rc,
      tcExact: this.tcExact(),
      tc: this.tcPlayer(),
      avail: this.availFor(h, s),
      splitHands: h.fromSplit ? s.hands.length : 1,
      chosen: a,
      handIndex: this.turn.hand,
    };
    this.current?.decisions.push(snap);
    this.apply(a);
    return snap;
  }

  private apply(a: Action): void {
    const s = this.seats[this.turn.seat];
    const h = s.hands[this.turn.hand];
    switch (a) {
      case 'hit': {
        h.cards.push(this.draw(this.turn.seat, this.turn.hand));
        const t = handTotal(h.cards.map(valueOf));
        if (t.total >= 21) h.done = true;
        break;
      }
      case 'stand':
        h.done = true;
        break;
      case 'double':
        h.bet *= 2;
        h.doubled = true;
        h.cards.push(this.draw(this.turn.seat, this.turn.hand));
        h.done = true;
        break;
      case 'surrender':
        h.surrendered = true;
        h.done = true;
        break;
      case 'split': {
        const aces = valueOf(h.cards[0]) === 1;
        const second = h.cards.pop()!;
        const nh: Hand = { cards: [second], bet: s.baseBet, doubled: false, surrendered: false, fromSplit: true, splitAces: aces, done: false };
        h.fromSplit = true;
        h.splitAces = aces;
        s.hands.splice(this.turn.hand + 1, 0, nh);
        h.cards.push(this.draw(this.turn.seat, this.turn.hand));
        if (aces && !this.rules.hitSplitAces && !(valueOf(h.cards[1]) === 1 && this.canSplit(h, s))) h.done = true;
        break;
      }
    }
    if (h.done) this.turn = { seat: this.turn.seat, hand: this.turn.hand + 1 };
    this.advance();
  }

  private dealerStep(): boolean {
    if (!this.holeRevealed) {
      this.revealHole();
      return true;
    }
    const live = this.seats.some((s) => s.hands.some((h) => !h.surrendered && handTotal(h.cards.map(valueOf)).total <= 21 && !(isBlackjack(h.cards.map(valueOf)) && !h.fromSplit)));
    const t = handTotal(this.dealer.map(valueOf));
    const mustHit = t.total < 17 || (t.total === 17 && t.soft && this.rules.h17);
    if (live && mustHit) {
      this.dealer.push(this.draw(-1, 0));
      return true;
    }
    this.settle(false);
    return true;
  }

  private settle(dealerBJ: boolean): void {
    const dv = this.dealer.map(valueOf);
    const dt = handTotal(dv).total;
    if (this.current) {
      this.current.net = 0;
      this.current.playerHands = [];
    }
    for (const s of this.seats) {
      if (!s.hands.length) continue;
      let seatNet = 0;
      if (s.insurance) seatNet += dealerBJ ? 2 * s.insurance : -s.insurance;
      for (const h of s.hands) {
        const v = h.cards.map(valueOf);
        const pt = handTotal(v).total;
        const bj = isBlackjack(v) && !h.fromSplit;
        let net: number;
        if (dealerBJ) net = bj ? 0 : -s.baseBet; // peek: only the original bet is lost
        else if (h.surrendered) net = -h.bet / 2;
        else if (bj) net = h.bet * this.rules.bjPayout;
        else if (pt > 21) net = -h.bet;
        else if (dt > 21 || pt > dt) net = h.bet;
        else if (pt < dt) net = -h.bet;
        else net = 0;
        h.net = net;
        seatNet += net;
      }
      if (s.human && this.current) {
        this.current.net += seatNet;
        this.current.dealerBJ = dealerBJ;
        this.current.dealer = [...this.dealer];
        this.current.playerHands.push(...s.hands.map((h) => ({ cards: [...h.cards], bet: h.bet, net: h.net ?? 0 })));
      }
    }
    if (this.current) {
      this.logs.push(this.current);
    }
    this.phase = 'settled';
    if (this.shoe.cutReached) this.needsShuffle = true;
  }

  /** Run automatic steps until the human must act or the round is settled. */
  runToHuman(maxSteps = 10000): void {
    for (let i = 0; i < maxSteps; i++) {
      if (this.waitingForHuman) return;
      if (!this.step()) return;
    }
  }
}
