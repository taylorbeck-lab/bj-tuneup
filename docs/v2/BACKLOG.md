# V2 backlog and direction

Owner's direction (2026-11-15), in their words where it matters:

> Whether it's flat or 3D in the long run, it simulates a true playing environment to make someone
> feel comfortable exactly on the same brain wavelength, same actions, same sequence that they're
> going to see in real life.

**Who it's for: the hobby player.** Not a full-time AP and not a speed-counting contest. Take someone with little blackjack knowledge through basic strategy, then count plays, then bet spread and counting, as fast as possible, by playing with a dealer who teaches naturally: checking your count, your bet and your play. Mistakes from tiredness or attention are normal and fine. The fun is the cat-and-mouse "I know something you don't" edge, and knowing when to pounce on a hot shoe.

Biggest complaint about other apps: the cards don't feel like real blackjack, because a computer shuffle isn't a live hand shuffle.

## To bundle with the owner's tweak list (not started)
1. **More decisions.** A dial that deals more of the hands that teach (splits, soft doubles, insurance spots, plays near their count number) by reordering cards already in the shoe, so the count stays true. Tone down "Practice my misses" (now 35% of rounds whenever there are misses) and never repeat a hand back to back.
2. **Off-the-chart plays.** When the exact odds for the cards left differ from the chart plus count plays (e.g. split 4s v 4 at +15), the coach shows a bonus note with the gain per $100; not graded unless the player chooses "grade me on everything". Optional "extended" count-plays chart out to big counts.
3. **Hand-shuffle realism.** Model the real thing: picked-up hands go to the tray in clumps; the dealer's shuffle (plugs, a few riffles, strip, cut) never fully mixes a 6-deck shoe, so shoes carry streaks and run hot or cold like a hand-shuffled game. Keep "machine shuffle" as an option. Measure the extra count swing before shipping. The owner sees this as a key differentiator, and somewhere AI can help (varied, natural-feeling shoes).
4. **Hot-shoe dial** (Off / Sometimes / Often), clearly labelled as training: some shoes run hot late (practise the pounce: ramp, big-count plays, leave), some cold (practise sitting at the minimum). The engine already has a `skew` knob.
5. **Settings live in the dealer.** A character dealer (a friendly, slightly shady AP friend teaching a friend) through whom most settings happen, instead of a separate settings page.
6. **Sound and haptics** (chip clicks, card snaps, shuffle riffle).
7. **Visual polish.** Table shape and symmetry (first pass done: rail drawn over the felt so the spots are symmetric; dealer hand centred).

## Measured baseline (perfect shuffle, 6D H17 DAS, 75% penetration)
- Per hand: a pair you should split 1 in 40; a soft hand 1 in 11; a double 1 in 10; a blackjack 1 in 21; a stiff (12–16) v 7–A 1 in 4.
- Per shoe: reaches true +3 in 43% of shoes, +5 in 23%, +8 in 6.8%; about 10% of rounds are played at +3 or more; 58% of shoes reach −3.
