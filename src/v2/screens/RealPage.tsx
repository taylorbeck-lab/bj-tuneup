/**
 * Before you play for real: José's do's and don'ts for a live table. The short list that decides
 * whether a game is worth sitting down at, and how to leave with the money.
 */
export function RealPage() {
  return (
    <div className="frame">
      <header className="hud">
        <a className="pill" href="#/">
          ← Table
        </a>
        <span className="spacer" />
        <a className="pill" href="#/plan">
          Plan a session
        </a>
      </header>
      <div className="page">
        <h1>
          Before you <span className="serif" style={{ fontSize: 34 }}>play for real</span>
        </h1>
        <div className="jose">
          <span className="jose-name">José · your dealer</span>
          <p>The count only pays at the right game, primo. Pick the game first, then play it short and sharp.</p>
        </div>

        <section className="group real-list no">
          <div className="gh">Never</div>
          <div className="row">
            <div>
              <div className="lbl">✗ Never play 6 to 5 blackjack</div>
              <div className="hint">It costs you about 1.4% on every bet, more than counting wins back. If the felt says “Blackjack pays 6 to 5”, walk.</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="lbl">✗ Never play a continuous shuffler</div>
              <div className="hint">The cards go back in after every hand, so there’s nothing to count. You’ll spot it: no discard tray, cards fed back into the machine. (A shuffle machine that shuffles between shoes is fine: it still deals down to the cut card.)</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="lbl">✗ Never use a device at the table</div>
              <div className="hint">Counting in your head is legal; a phone, an app or any device to count or work out odds is illegal in Nevada and many other places. Practice here, play in your head.</div>
            </div>
          </div>
        </section>

        <section className="group real-list">
          <div className="gh">Read the game before you sit</div>
          <div className="row">
            <div>
              <div className="lbl">Where the cut card goes</div>
              <div className="hint">The deeper the cut, the more good counts you see. Cut off half a shoe or more and the hot counts never come. Watch it every shuffle.</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="lbl">Decks and players</div>
              <div className="hint">Double deck beats six. Fewer players means more hands per shoe and more of the hot ones. A crowded table with a shallow cut is a waste of your time.</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="lbl">The rules on the felt</div>
              <div className="hint">3 to 2 first. Then dealer stands on soft 17, double after split and surrender all help you. Put it through the planner if you’re not sure.</div>
            </div>
            <a className="pill" href="#/plan">
              Plan
            </a>
          </div>
        </section>

        <section className="group real-list">
          <div className="gh">Play it short and sharp</div>
          <div className="row">
            <div>
              <div className="lbl">Strike and go</div>
              <div className="hint">A strong game pays in a short session; a thin one only pays over many hours, with big swings. The better the game, the less time you need. Leave on your terms.</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="lbl">Spread with cover</div>
              <div className="hint">Bets that jump with the count are the biggest tell. Ease up and down, make the odd off play, chat, don’t stare at the discard tray. Never push the table max on every hot count.</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="lbl">Don’t wear out your welcome</div>
              <div className="hint">Short sessions, different shifts, different tables. A small bettor who leaves on time is rarely worth the pit’s trouble.</div>
            </div>
          </div>
          <div className="row">
            <div>
              <div className="lbl">Bring money you’re fine losing</div>
              <div className="hint">Even a great game loses close to half of short sessions. The edge shows over many of them, not any one night.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
