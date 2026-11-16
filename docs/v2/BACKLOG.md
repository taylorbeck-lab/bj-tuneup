# V2 backlog and direction

Owner's direction (2026-11-15), in their words where it matters:

> Whether it's flat or 3D in the long run, it simulates a true playing environment to make someone
> feel comfortable exactly on the same brain wavelength, same actions, same sequence that they're
> going to see in real life.

**Who it's for: the hobby player.** Not a full-time AP and not a speed-counting contest. Take someone with little blackjack knowledge through basic strategy, then count plays, then bet spread and counting, as fast as possible, by playing with a dealer who teaches naturally: checking your count, your bet and your play. Mistakes from tiredness or attention are normal and fine. The fun is the cat-and-mouse "I know something you don't" edge, and knowing when to pounce on a hot shoe.

Biggest complaint about other apps: the cards don't feel like real blackjack, because a computer shuffle isn't a live hand shuffle.

## Principles (owner, 2026-11-15)
- **Feedback after the fact.** Never coach before or during a decision.
- **Never show the count at the wrong time.** Nobody at a real table tells you the count when you lose it; the coach's short line never states it, and the full card (one tap) is where the number lives. The count badge is opt-in training wheels.
- **No app-only conveniences that don't exist at a real table.** Every deal is a fresh chance to size the bet: Rebet is gone; after a win or push your chips simply stay in the circle, after a loss you bet again. "Tap to continue" and hand-total tags are gone too (the dealer pays or takes on the felt). Next candidate: busted hands could be taken right away, as dealers do.
- **Minimal and pleasing:** a quiet feedback loop, not a wall of text.
- **Settings live in the environment, through the dealer**, like a friend dealing to a friend to teach.

## Talk to the dealer (next big piece)
A "say something" button by the dealer opens a few natural lines you'd actually say at a table, which change settings in place:
- "Cut it a little deeper" / "Shallower cut" (penetration)
- "Can we play six decks?" / "Double deck?" (decks)
- "Slow down" / "Speed it up" (dealer pace)
- "Whisper me the count" (count badge on/off), "Ask me the count more" (count checks)
- "Shuffle up", "I'll take third base", "Open up a seat" (seat, players)
- "Raise the limits" / "Lower the limits" (table minimum)

With the player's own Claude key, free text works too ("let's do a tough double-deck game, deep cut, I want count plays"), mapped onto the same changes with tool use. The dealer answers in character (friendly, a bit shady, on your side). The settings page stays as the place for everything else.

## To bundle with the owner's tweak list (not started)
1. **More decisions.** A dial that deals more of the hands that teach (splits, soft doubles, insurance spots, plays near their count number) by reordering cards already in the shoe, so the count stays true. Tone down "Practice my misses" (now 35% of rounds whenever there are misses) and never repeat a hand back to back.
2. **Off-the-chart plays.** When the exact odds for the cards left differ from the chart plus count plays (e.g. split 4s v 4 at +15), the coach shows a bonus note with the gain per $100; not graded unless the player chooses "grade me on everything". Optional "extended" count-plays chart out to big counts.
3. **Hand-shuffle realism.** Model the real thing: picked-up hands go to the tray in clumps; the dealer's shuffle (plugs, a few riffles, strip, cut) never fully mixes a 6-deck shoe, so shoes carry streaks and run hot or cold like a hand-shuffled game. Keep "machine shuffle" as an option. Measure the extra count swing before shipping. The owner sees this as a key differentiator, and somewhere AI can help (varied, natural-feeling shoes).
4. **Hot-shoe dial** (Off / Sometimes / Often), clearly labelled as training: some shoes run hot late (practise the pounce: ramp, big-count plays, leave), some cold (practise sitting at the minimum). The engine already has a `skew` knob.
5. **Settings live in the dealer.** (José is on the table now: first flat pass, short lines.) A character dealer (a friendly, slightly shady AP friend teaching a friend) through whom most settings happen, instead of a separate settings page.
6. **Sound and haptics** (chip clicks, card snaps, shuffle riffle).
7. **Visual polish.** Table shape and symmetry (done: rail over the felt, dealer hand centred, collision-free card layout).

## Measured baseline (perfect shuffle, 6D H17 DAS, 75% penetration)
- Per hand: a pair you should split 1 in 40; a soft hand 1 in 11; a double 1 in 10; a blackjack 1 in 21; a stiff (12–16) v 7–A 1 in 4.
- Per shoe: reaches true +3 in 43% of shoes, +5 in 23%, +8 in 6.8%; about 10% of rounds are played at +3 or more; 58% of shoes reach −3.
