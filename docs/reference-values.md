# Reference values for engine tests

Published numbers that the math engine (SPEC 3.4–3.8) is unit-tested against. Every number below was read from a source page on 2026-11-14. Wherever a table was long, the cells were copied by script from the downloaded page text, not retyped. Where a value was **computed** from published data rather than printed on the page, the entry says so and shows the arithmetic.

**Source coverage.** Only `wizardofodds.com` (Michael Shackleford) and `en.wikipedia.org` were reachable from this session. Blackjack Apprenticeship, bjstrat.net, QFIT, Wizard of Vegas, Eliot Jacobson's blog (apheat.net / 888casino), Las Vegas Advisor and reddit were blocked by the network allowlist. As a result:

- Nothing here comes from Griffin's *Theory of Blackjack* or from Jacobson directly.
- There are no H17-specific Illustrious 18 indices.
- Section E uses Wizard of Odds effect-of-removal tables in place of Griffin's.

**Conventions.**

- EV is expressed per one unit of initial bet. +1 means an even-money win; doubles and splits can go beyond ±1.
- "House edge" is −EV.
- Unless a section says otherwise, Wizard's player-hand EVs assume the dealer has **already peeked and does not have blackjack**.

---

## A. Dealer final-outcome probabilities by upcard

### A1. After the peek, conditioned on no dealer blackjack (US rules)

Source: Wizard of Odds, *Dealer Odds in Blackjack under U.S. Rules* (Appendix 2a), https://wizardofodds.com/games/blackjack/dealer-odds-blackjack-us-rules/

The page says: "The tables assume the dealer already checked for, and did not have, blackjack." The column "21" means a multi-card 21. In the 10 and Ace rows, the 21 column excludes blackjack because blackjack has been ruled out.

**1 Deck — Dealer Stands on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.183786 | 0.19089 | 0.18868 | 0.191692 | 0.075137 | 0.169815 |
| 2 | 0.138976 | 0.131762 | 0.131815 | 0.123948 | 0.120526 | 0.352973 |
| 3 | 0.130313 | 0.130946 | 0.123761 | 0.123345 | 0.116047 | 0.375588 |
| 4 | 0.130973 | 0.114163 | 0.120679 | 0.116286 | 0.115096 | 0.402803 |
| 5 | 0.119687 | 0.123483 | 0.116909 | 0.104694 | 0.106321 | 0.428905 |
| 6 | 0.166948 | 0.106454 | 0.107192 | 0.100705 | 0.097879 | 0.420823 |
| 7 | 0.372345 | 0.138583 | 0.077334 | 0.078897 | 0.072987 | 0.259854 |
| 8 | 0.130857 | 0.362989 | 0.129445 | 0.06829 | 0.069791 | 0.238627 |
| 9 | 0.121886 | 0.103921 | 0.357391 | 0.12225 | 0.061109 | 0.233442 |
| 10 | 0.124156 | 0.122486 | 0.124421 | 0.356869 | 0.03957 | 0.232499 |
| All | 0.153225 | 0.145065 | 0.141657 | 0.184722 | 0.077364 | 0.297967 |

**2 Decks- Dealer Stands on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.186367 | 0.189883 | 0.188851 | 0.190272 | 0.076531 | 0.168096 |
| 2 | 0.139367 | 0.133348 | 0.130744 | 0.123997 | 0.119254 | 0.353291 |
| 3 | 0.132764 | 0.130676 | 0.124575 | 0.121811 | 0.11538 | 0.374794 |
| 4 | 0.130704 | 0.120208 | 0.121038 | 0.116366 | 0.113145 | 0.39854 |
| 5 | 0.121005 | 0.122831 | 0.117318 | 0.109022 | 0.10732 | 0.422505 |
| 6 | 0.166224 | 0.10617 | 0.106749 | 0.101217 | 0.097508 | 0.422132 |
| 7 | 0.370478 | 0.138195 | 0.078013 | 0.078781 | 0.07339 | 0.261143 |
| 8 | 0.129697 | 0.361182 | 0.129025 | 0.068857 | 0.06961 | 0.24163 |
| 9 | 0.12094 | 0.112016 | 0.354051 | 0.121118 | 0.060977 | 0.230898 |
| 10 | 0.122412 | 0.1216 | 0.122524 | 0.36387 | 0.038449 | 0.231144 |
| All | 0.152784 | 0.145746 | 0.140865 | 0.186996 | 0.076841 | 0.296767 |

**6 Decks -- Dealer Stands on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.188071 | 0.189235 | 0.188906 | 0.189362 | 0.077394 | 0.167033 |
| 2 | 0.139656 | 0.134389 | 0.13002 | 0.124019 | 0.118413 | 0.353504 |
| 3 | 0.134296 | 0.130539 | 0.125226 | 0.120817 | 0.114928 | 0.374194 |
| 4 | 0.130556 | 0.124062 | 0.121272 | 0.116441 | 0.111866 | 0.395805 |
| 5 | 0.121843 | 0.122437 | 0.117575 | 0.111793 | 0.107945 | 0.418406 |
| 6 | 0.165707 | 0.106194 | 0.106431 | 0.101551 | 0.097276 | 0.422842 |
| 7 | 0.369208 | 0.137931 | 0.078428 | 0.078682 | 0.073816 | 0.261936 |
| 8 | 0.12894 | 0.359955 | 0.128723 | 0.069219 | 0.06947 | 0.243693 |
| 9 | 0.12031 | 0.117348 | 0.351854 | 0.120368 | 0.060877 | 0.229242 |
| 10 | 0.121273 | 0.121007 | 0.121306 | 0.368447 | 0.037729 | 0.230239 |
| All | 0.152487 | 0.146201 | 0.14035 | 0.188478 | 0.076507 | 0.295977 |

**8 Decks -- Dealer Stands on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.188283 | 0.189155 | 0.18891 | 0.189251 | 0.077498 | 0.166904 |
| 2 | 0.139694 | 0.134518 | 0.129929 | 0.124021 | 0.118308 | 0.35353 |
| 3 | 0.134482 | 0.130524 | 0.125313 | 0.120695 | 0.114871 | 0.374115 |
| 4 | 0.130539 | 0.124534 | 0.1213 | 0.116451 | 0.111707 | 0.395469 |
| 5 | 0.121946 | 0.12239 | 0.117607 | 0.112134 | 0.108021 | 0.417902 |
| 6 | 0.16564 | 0.106208 | 0.10639 | 0.101592 | 0.097247 | 0.422922 |
| 7 | 0.369048 | 0.137898 | 0.078478 | 0.078668 | 0.073878 | 0.262031 |
| 8 | 0.128846 | 0.3598 | 0.128684 | 0.069263 | 0.069452 | 0.243954 |
| 9 | 0.120231 | 0.118011 | 0.351581 | 0.120275 | 0.060864 | 0.229037 |
| 10 | 0.121132 | 0.120933 | 0.121156 | 0.369014 | 0.03764 | 0.230125 |
| All | 0.152449 | 0.146258 | 0.140286 | 0.188661 | 0.076466 | 0.295879 |

**One Deck — Dealer Hits on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.081776 | 0.205386 | 0.206161 | 0.20946 | 0.092642 | 0.204574 |
| 2 | 0.129779 | 0.133108 | 0.133172 | 0.125623 | 0.121973 | 0.356345 |
| 3 | 0.123527 | 0.131936 | 0.124949 | 0.12421 | 0.117303 | 0.378075 |
| 4 | 0.122786 | 0.115374 | 0.121907 | 0.11779 | 0.116348 | 0.405796 |
| 5 | 0.116656 | 0.123838 | 0.117448 | 0.105239 | 0.106858 | 0.429961 |
| 6 | 0.116106 | 0.11381 | 0.116056 | 0.109615 | 0.106657 | 0.437756 |
| 7 | 0.372345 | 0.138583 | 0.077334 | 0.078897 | 0.072987 | 0.259854 |
| 8 | 0.130857 | 0.362989 | 0.129445 | 0.06829 | 0.069791 | 0.238627 |
| 9 | 0.121886 | 0.103921 | 0.357391 | 0.12225 | 0.061109 | 0.233442 |
| 10 | 0.124156 | 0.122486 | 0.124421 | 0.356869 | 0.03957 | 0.232499 |
| All | 0.141259 | 0.146779 | 0.143692 | 0.186799 | 0.079407 | 0.302064 |

**Two Decks -- Dealer Hits on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.082426 | 0.206094 | 0.206546 | 0.208112 | 0.094266 | 0.202556 |
| 2 | 0.129949 | 0.134838 | 0.132234 | 0.12565 | 0.120801 | 0.356527 |
| 3 | 0.124999 | 0.131904 | 0.125913 | 0.12297 | 0.116754 | 0.37746 |
| 4 | 0.122575 | 0.121499 | 0.122342 | 0.117798 | 0.114458 | 0.401328 |
| 5 | 0.117533 | 0.123331 | 0.11792 | 0.109627 | 0.107921 | 0.423668 |
| 6 | 0.1155 | 0.114155 | 0.115451 | 0.109956 | 0.106185 | 0.438754 |
| 7 | 0.370478 | 0.138195 | 0.078013 | 0.078781 | 0.07339 | 0.261143 |
| 8 | 0.129697 | 0.361182 | 0.129025 | 0.068857 | 0.06961 | 0.24163 |
| 9 | 0.12094 | 0.112016 | 0.354051 | 0.121118 | 0.060977 | 0.230898 |
| 10 | 0.122412 | 0.1216 | 0.122524 | 0.36387 | 0.038449 | 0.231144 |
| All | 0.140573 | 0.147658 | 0.142936 | 0.189087 | 0.07892 | 0.300825 |

**6 Decks -- Dealer Hits on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.082842 | 0.206593 | 0.206757 | 0.207262 | 0.095264 | 0.201281 |
| 2 | 0.130071 | 0.135978 | 0.131607 | 0.125662 | 0.120022 | 0.356661 |
| 3 | 0.1259 | 0.13193 | 0.126656 | 0.122185 | 0.116371 | 0.376958 |
| 4 | 0.122458 | 0.125405 | 0.12262 | 0.11783 | 0.113217 | 0.39847 |
| 5 | 0.118089 | 0.123042 | 0.118216 | 0.112435 | 0.108586 | 0.419632 |
| 6 | 0.115064 | 0.114574 | 0.115043 | 0.110177 | 0.105882 | 0.439259 |
| 7 | 0.369208 | 0.137931 | 0.078428 | 0.078682 | 0.073816 | 0.261936 |
| 8 | 0.12894 | 0.359955 | 0.128723 | 0.069219 | 0.06947 | 0.243693 |
| 9 | 0.12031 | 0.117348 | 0.351854 | 0.120368 | 0.060877 | 0.229242 |
| 10 | 0.121273 | 0.121007 | 0.121306 | 0.368447 | 0.037729 | 0.230239 |
| All | 0.140113 | 0.148245 | 0.142446 | 0.190581 | 0.078607 | 0.300007 |

**8 Decks -- Dealer Hits on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | Bust |
|---|---|---|---|---|---|---|
| Ace | 0.082894 | 0.206657 | 0.206781 | 0.207159 | 0.095384 | 0.201125 |
| 2 | 0.130087 | 0.13612 | 0.131529 | 0.125663 | 0.119924 | 0.356677 |
| 3 | 0.126008 | 0.131936 | 0.126754 | 0.122089 | 0.116322 | 0.376891 |
| 4 | 0.122445 | 0.125884 | 0.122654 | 0.117836 | 0.113063 | 0.398119 |
| 5 | 0.118157 | 0.123009 | 0.118252 | 0.11278 | 0.108666 | 0.419136 |
| 6 | 0.115008 | 0.114637 | 0.114992 | 0.110205 | 0.105845 | 0.439314 |
| 7 | 0.369048 | 0.137898 | 0.078478 | 0.078668 | 0.073878 | 0.262031 |
| 8 | 0.128846 | 0.3598 | 0.128684 | 0.069263 | 0.069452 | 0.243954 |
| 9 | 0.120231 | 0.118011 | 0.351581 | 0.120275 | 0.060864 | 0.229037 |
| 10 | 0.121132 | 0.120933 | 0.121156 | 0.369014 | 0.03764 | 0.230125 |
| All | 0.140055 | 0.148318 | 0.142386 | 0.190766 | 0.078569 | 0.299906 |

**Test invariants visible in the tables:**

- Rows 7, 8, 9 and 10 are identical between S17 and H17. With those upcards the dealer can never hold a soft 17.
- Each row sums to 1 (±1e-6).

Average dealer total when the dealer does not bust (same page): 2 decks 18.842648 (S17) / 18.882868 (H17); 6 decks 18.844205 (S17) / 18.88472 (H17).

**Six decks, before the peek (includes blackjack), broken down by the number of cards in a busted hand** (same page; used to cross-check Buster Blackjack in section F):

| Event | Stand Soft 17 | Hit Soft 17 |
|---|---|---|
| Dealer blackjack | 0.0474894880039574 | 0.0474894880039574 |
| Total of 17 | 0.1452452688762730 | 0.1334589459656700 |
| Total of 18 | 0.1392577712671790 | 0.1412046774882130 |
| Total of 19 | 0.1336847392868550 | 0.1356816733415020 |
| Total of 20 | 0.1795273038236620 | 0.1815306022489940 |
| Total of 21 | 0.0728740870713831 | 0.0748744175668735 |
| Bust with 3 cards | 0.1730318431697950 | 0.1730318431697950 |
| Bust with 4 cards | 0.0872738945778543 | 0.0893918097334332 |
| Bust with 5 cards | 0.0191193879779139 | 0.0204725508735587 |
| Bust with 6 cards | 0.0023151220619265 | 0.0026376021859953 |
| Bust with 7 cards | 0.0001726381111420 | 0.0002144441681795 |
| Bust with 8 cards | 0.0000082097440626 | 0.0000115279883244 |

### A2. Before the peek, unconditioned and including blackjack (European / no-peek view)

Source: Wizard of Odds, *Dealer Odds in Blackjack under European Rules* (Appendix 2b), https://wizardofodds.com/games/blackjack/dealer-odds-blackjack-european-rules/ ("The tables assume the dealer did not yet peek for blackjack").

Only the upcard is removed from the full shoe; the player's cards are not removed. For example, 2 decks with a 10 up gives BJ = 0.0776699 = 8/103, and with an Ace up gives BJ = 0.31068 = 32/103. Tests must build the shoe the same way.

**2 Decks — Dealer Stands on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | BJ | Bust |
|---|---|---|---|---|---|---|---|
| Ace | 0.128467 | 0.13089 | 0.130179 | 0.131159 | 0.0527542 | 0.31068 | 0.115872 |
| 2 | 0.139367 | 0.133348 | 0.130744 | 0.123997 | 0.119254 | 0 | 0.353291 |
| 3 | 0.132764 | 0.130676 | 0.124575 | 0.121811 | 0.11538 | 0 | 0.374794 |
| 4 | 0.130704 | 0.120208 | 0.121038 | 0.116366 | 0.113145 | 0 | 0.39854 |
| 5 | 0.121005 | 0.122831 | 0.117318 | 0.109022 | 0.10732 | 0 | 0.422505 |
| 6 | 0.166224 | 0.10617 | 0.106749 | 0.101217 | 0.0975079 | 0 | 0.422132 |
| 7 | 0.370478 | 0.138195 | 0.0780126 | 0.0787814 | 0.0733896 | 0 | 0.261143 |
| 8 | 0.129697 | 0.361182 | 0.129025 | 0.0688569 | 0.0696101 | 0 | 0.24163 |
| 9 | 0.12094 | 0.112016 | 0.354051 | 0.121118 | 0.0609771 | 0 | 0.230898 |
| 10 | 0.112904 | 0.112156 | 0.113008 | 0.335608 | 0.035463 | 0.0776699 | 0.213191 |
| All | 0.145482 | 0.13878 | 0.134132 | 0.178058 | 0.0731685 | 0.0477969 | 0.282582 |

**6 Decks — Dealer Stands on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | BJ | Bust |
|---|---|---|---|---|---|---|---|
| Ace | 0.130017 | 0.130822 | 0.130594 | 0.13091 | 0.0535035 | 0.308682 | 0.115473 |
| 2 | 0.139656 | 0.134389 | 0.13002 | 0.124019 | 0.118413 | 0 | 0.353504 |
| 3 | 0.134296 | 0.130539 | 0.125226 | 0.120817 | 0.114928 | 0 | 0.374194 |
| 4 | 0.130556 | 0.124062 | 0.121272 | 0.116441 | 0.111866 | 0 | 0.395805 |
| 5 | 0.121843 | 0.122437 | 0.117575 | 0.111793 | 0.107945 | 0 | 0.418406 |
| 6 | 0.165707 | 0.106194 | 0.106431 | 0.101551 | 0.0972756 | 0 | 0.422842 |
| 7 | 0.369208 | 0.137931 | 0.078428 | 0.0786816 | 0.0738158 | 0 | 0.261936 |
| 8 | 0.12894 | 0.359955 | 0.128723 | 0.0692189 | 0.0694701 | 0 | 0.243693 |
| 9 | 0.12031 | 0.117348 | 0.351854 | 0.120368 | 0.0608772 | 0 | 0.229242 |
| 10 | 0.111914 | 0.111669 | 0.111945 | 0.340014 | 0.0348174 | 0.0771704 | 0.212471 |
| All | 0.145245 | 0.139258 | 0.133685 | 0.179527 | 0.0728741 | 0.0474895 | 0.281921 |

**Two Decks — Dealer Hits on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | BJ | Bust |
|---|---|---|---|---|---|---|---|
| Ace | 0.056818 | 0.142065 | 0.142376 | 0.143456 | 0.0649796 | 0.31068 | 0.139626 |
| 2 | 0.129949 | 0.134838 | 0.132234 | 0.12565 | 0.120801 | 0 | 0.356527 |
| 3 | 0.124999 | 0.131904 | 0.125913 | 0.12297 | 0.116754 | 0 | 0.37746 |
| 4 | 0.122575 | 0.121499 | 0.122342 | 0.117798 | 0.114458 | 0 | 0.401328 |
| 5 | 0.117533 | 0.123331 | 0.11792 | 0.109627 | 0.107921 | 0 | 0.423668 |
| 6 | 0.1155 | 0.114155 | 0.115451 | 0.109956 | 0.106185 | 0 | 0.438754 |
| 7 | 0.370478 | 0.138195 | 0.0780126 | 0.0787814 | 0.0733896 | 0 | 0.261143 |
| 8 | 0.129697 | 0.361182 | 0.129025 | 0.0688569 | 0.0696101 | 0 | 0.24163 |
| 9 | 0.12094 | 0.112016 | 0.354051 | 0.121118 | 0.0609771 | 0 | 0.230898 |
| 10 | 0.112904 | 0.112156 | 0.113008 | 0.335608 | 0.035463 | 0.0776699 | 0.213191 |
| All | 0.133854 | 0.140601 | 0.136104 | 0.18005 | 0.0751482 | 0.0477969 | 0.286446 |

**Six Decks — Dealer Hits on Soft 17**

| Upcard | 17 | 18 | 19 | 20 | 21 | BJ | Bust |
|---|---|---|---|---|---|---|---|
| Ace | 0.0572705 | 0.142822 | 0.142935 | 0.143284 | 0.0658578 | 0.308682 | 0.139149 |
| 2 | 0.130071 | 0.135978 | 0.131607 | 0.125662 | 0.120022 | 0 | 0.356661 |
| 3 | 0.1259 | 0.13193 | 0.126656 | 0.122185 | 0.116371 | 0 | 0.376958 |
| 4 | 0.122458 | 0.125405 | 0.12262 | 0.11783 | 0.113217 | 0 | 0.39847 |
| 5 | 0.118089 | 0.123042 | 0.118216 | 0.112435 | 0.108586 | 0 | 0.419632 |
| 6 | 0.115064 | 0.114574 | 0.115043 | 0.110177 | 0.105882 | 0 | 0.439259 |
| 7 | 0.369208 | 0.137931 | 0.078428 | 0.0786816 | 0.0738158 | 0 | 0.261936 |
| 8 | 0.12894 | 0.359955 | 0.128723 | 0.0692189 | 0.0694701 | 0 | 0.243693 |
| 9 | 0.12031 | 0.117348 | 0.351854 | 0.120368 | 0.0608772 | 0 | 0.229242 |
| 10 | 0.111914 | 0.111669 | 0.111945 | 0.340014 | 0.0348174 | 0.0771704 | 0.212471 |
| All | 0.133459 | 0.141205 | 0.135682 | 0.181531 | 0.0748744 | 0.0474895 | 0.28576 |

Infinite-deck dealer tables were not found as a separate table. The infinite-deck "stand on ≤16" row in B1 gives 2·P(bust) − 1 for each upcard, which serves as an indirect check.

---

## B. Player EVs for specific hands

### B1. Infinite deck, total-dependent (Appendix 1)

Source: https://wizardofodds.com/games/blackjack/expected-return-infinite-deck/

Rules quoted from the page: "dealer stands on a soft 17, an infinite deck, the player may double after a split, split up to three times except for aces, and draw only one card to split aces. Based on these rules, the player's expected value is -0.511734%."

The page does not say whether the values are conditioned on no dealer blackjack, but they are consistent with it. For example, stand ≤16 vs 10 = −0.540430 implies P(bust | 10 up, no BJ) ≈ 0.2298.

The page's own worked example: "two 8's and the dealer has a 10. The return by standing is -0.5404, by hitting is -0.5398, doubling is -1.0797, and by splitting is -0.4807."

| Action | Player | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | Ace |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Stand | 0-16 | -0.292784 | -0.252250 | -0.211063 | -0.167193 | -0.153699 | -0.475375 | -0.510518 | -0.543150 | -0.540430 | -0.666951 |
| Stand | 17 | -0.152975 | -0.117216 | -0.080573 | -0.044941 | 0.011739 | -0.106809 | -0.381951 | -0.423154 | -0.419721 | -0.478033 |
| Stand | 18 | 0.121742 | 0.148300 | 0.175854 | 0.199561 | 0.283444 | 0.399554 | 0.105951 | -0.183163 | -0.178301 | -0.100199 |
| Stand | 19 | 0.386305 | 0.404363 | 0.423179 | 0.439512 | 0.495977 | 0.615976 | 0.593854 | 0.287597 | 0.063118 | 0.277636 |
| Stand | 20 | 0.639987 | 0.650272 | 0.661050 | 0.670360 | 0.703959 | 0.773227 | 0.791815 | 0.758357 | 0.554538 | 0.655470 |
| Hit | 9 | 0.074446 | 0.101265 | 0.128981 | 0.158032 | 0.196019 | 0.171868 | 0.098376 | -0.052178 | -0.152953 | -0.065681 |
| Hit | 10 | 0.182500 | 0.206088 | 0.230470 | 0.256259 | 0.287795 | 0.256909 | 0.197954 | 0.116530 | 0.025309 | 0.081450 |
| Hit | 11 | 0.238351 | 0.260325 | 0.283020 | 0.307350 | 0.333690 | 0.292147 | 0.229982 | 0.158257 | 0.119482 | 0.143001 |
| Hit | 12 | -0.253390 | -0.233691 | -0.213537 | -0.193271 | -0.170526 | -0.212848 | -0.271575 | -0.340013 | -0.381043 | -0.350540 |
| Hit | 16 | -0.470995 | -0.463768 | -0.456286 | -0.449520 | -0.430927 | -0.414779 | -0.458440 | -0.509322 | -0.539826 | -0.517149 |
| Hit | Soft 18 | 0.062905 | 0.090248 | 0.118502 | 0.147613 | 0.190753 | 0.170676 | 0.039677 | -0.100744 | -0.143808 | -0.092935 |
| Double | Hard 9 | 0.061119 | 0.120816 | 0.181949 | 0.243057 | 0.317055 | 0.104250 | -0.026442 | -0.300996 | -0.466707 | -0.432911 |
| Double | Hard 10 | 0.358939 | 0.409321 | 0.460940 | 0.512517 | 0.575590 | 0.392412 | 0.286636 | 0.144328 | -0.008659 | -0.014042 |
| Double | Hard 11 | 0.470641 | 0.517795 | 0.566041 | 0.614699 | 0.667380 | 0.462889 | 0.350693 | 0.227783 | 0.179689 | 0.109061 |
| Double | Soft 13 | -0.071570 | -0.007228 | 0.058427 | 0.125954 | 0.179748 | -0.183866 | -0.314441 | -0.456367 | -0.514028 | -0.624391 |
| Double | Soft 18 | 0.119750 | 0.177641 | 0.237004 | 0.295225 | 0.381506 | 0.219948 | -0.029917 | -0.290219 | -0.346892 | -0.362813 |
| Split | 4,4 | -0.192325 | -0.108712 | -0.020395 | 0.081913 | 0.151377 | -0.166452 | -0.326068 | -0.511152 | -0.625044 | -0.560206 |
| Split | 8,8 | 0.073852 | 0.146187 | 0.220849 | 0.297475 | 0.409329 | 0.321042 | -0.022736 | -0.387228 | -0.480686 | -0.372535 |
| Split | 9,9 | 0.195625 | 0.258548 | 0.323474 | 0.391987 | 0.471339 | 0.364837 | 0.234447 | -0.078010 | -0.317336 | -0.136810 |
| Split | A,A | 0.470641 | 0.517795 | 0.566041 | 0.614699 | 0.667380 | 0.462889 | 0.350693 | 0.227783 | 0.179689 | 0.109061 |

**Consistency checks:**

- **Double row.** Double = 2 × Σ P(card) × Stand(total after one card). For hard 10 vs 10: 2 × [(4/13)(0.554538) + (1/13)(0.962624) + (1/13)(0.063118) + (1/13)(−0.178301) + (1/13)(−0.419721) + (5/13)(−0.540430)] = −0.008659, which matches the table.
- **Split A,A equals double hard 11.** In an infinite deck with one card per split ace, the two are identical.
- **Hard 10 hit equals Soft 20 hit.**

### B2. Infinite deck, infinite resplitting (Appendix 5)

Source: https://wizardofodds.com/games/blackjack/player-expected-return/

The rules listed on the page are:

- "Dealer does not have a blackjack"
- "Dealer stands on a soft 17"
- "Double after split allowed"
- "Infinite resplitting"
- "Split aces get one card each"
- "Infinite number of decks."

The page then says: "Based on these rules the house edge is 0.5093975%."

Best-play EV (4 decimals as printed): 8,8 vs 10 = −0.4803; 16 vs 10 = −0.5398; 11 vs A = 0.143; A,A vs 6 = 0.6674; A,7 vs 2 = 0.1217. The same page gives the EV of the first card before anything else is known: A = 0.501668, 10 = 0.143489, 6 = −0.211117.

### B3. Composition-dependent, full shoe, 2 and 6 decks (Appendix 9)

Sources (menu: https://wizardofodds.com/games/blackjack/expected-values/):

- 2D S17: https://wizardofodds.com/games/blackjack/appendix/9/2ds17r4/
- 2D H17: https://wizardofodds.com/games/blackjack/appendix/9/2dh17r4/
- 6D S17: https://wizardofodds.com/games/blackjack/appendix/9/6ds17r4/
- 6D H17: https://wizardofodds.com/games/blackjack/appendix/9/6dh17r4/

Rules on every page:

- "Player may resplit to four hands, except aces"
- "No drawing to split aces"
- The menu page says: "All numbers in the following tables assume the dealer already peeked for blackjack, with a ten or ace up, and did not have it."
- No surrender column is given.
- Method, quoted: "recursive combinatorial program that considered the exact hand composition at every step. For splitting values the program only considered how many hands the player had already split, but not the other cards drawn in those hands."

"Hit" means the EV of hitting and then playing optimally by exact composition. "Probability" is the probability of that initial deal.

Game EV printed on each page (DAS / no DAS):

| Rules | Player may double after split | Player may not double after split |
|---|---|---|
| 2 decks S17 | -0.001779 | -0.003208 |
| 2 decks H17 | -0.003797 | -0.005252 |
| 6 decks S17 | -0.004026 | -0.005445 |
| 6 decks H17 | -0.006151 | -0.007598 |

**2 decks, S17**

| Upcard | Player | Stand | Hit | Double | Probability |
|---|---|---|---|---|---|
| 10 | 10,6 | -0.541889 | -0.523992 | -1.047984 | 0.01337589 |
| 10 | 9,7 | -0.529433 | -0.526286 | -1.052572 | 0.00345184 |
| 2 | 10,2 | -0.301915 | -0.248636 | -0.497272 | 0.00328018 |
| 3 | 10,2 | -0.259456 | -0.226608 | -0.453215 | 0.00374877 |
| 4 | 10,2 | -0.211303 | -0.203909 | -0.407818 | 0.00374877 |
| A | 6,5 | -0.651264 | 0.157240 | 0.172433 | 0.00064026 |
| A | 8,3 | -0.658982 | 0.156258 | 0.155381 | 0.00064026 |
| 2 | 5,4 | -0.282928 | 0.084468 | 0.087997 | 0.00093719 |
| 2 | 7,A | 0.128632 | 0.064072 | 0.123539 | 0.00093719 |
| 4 | 3,A | -0.190888 | 0.085205 | 0.083857 | 0.00093719 |
| 10 | 6,4 | -0.545336 | 0.029897 | 0.000806 | 0.00345184 |
| 10 | 10,A | 1.500000 | 0.112213 | 0.159892 | 0.01351971 |

| Upcard | Player | Stand | Hit | Double | Split (DAS=No) | Split (DAS=Yes) | Probability |
|---|---|---|---|---|---|---|---|
| 10 | 8,8 | -0.529565 | -0.526181 | -1.052362 | -0.474649 | -0.463745 | 0.00151018 |
| 6 | A,A | -0.129268 | 0.192311 | 0.213109 | 0.712562 | 0.712562 | 0.00041002 |
| 4 | 4,4 | -0.183112 | 0.067218 | -0.013696 | -0.070101 | 0.052111 | 0.00030752 |
| 6 | 9,9 | 0.275070 | -0.597222 | -1.194444 | 0.389154 | 0.448563 | 0.00041002 |
| 10 | 10,10 | 0.568553 | -0.843225 | -1.686450 | -0.415431 | -0.415431 | 0.02507978 |

**2 decks, H17**

| Upcard | Player | Stand | Hit | Double | Probability |
|---|---|---|---|---|---|
| 10 | 10,6 | -0.541889 | -0.523992 | -1.047984 | 0.01337589 |
| 10 | 9,7 | -0.529433 | -0.526286 | -1.052572 | 0.00345184 |
| 2 | 10,2 | -0.295189 | -0.249031 | -0.498063 | 0.00328018 |
| 3 | 10,2 | -0.253886 | -0.226933 | -0.453867 | 0.00374877 |
| 4 | 10,2 | -0.206125 | -0.204205 | -0.408411 | 0.00374877 |
| A | 6,5 | -0.587564 | 0.121079 | 0.166650 | 0.00064026 |
| A | 8,3 | -0.588832 | 0.117332 | 0.150867 | 0.00064026 |
| 2 | 5,4 | -0.276760 | 0.082575 | 0.086204 | 0.00093719 |
| 2 | 7,A | 0.118882 | 0.061594 | 0.119481 | 0.00093719 |
| 4 | 3,A | -0.185697 | 0.086531 | 0.087059 | 0.00093719 |
| 10 | 6,4 | -0.545336 | 0.029897 | 0.000806 | 0.00345184 |
| 10 | 10,A | 1.500000 | 0.112213 | 0.159892 | 0.01351971 |

| Upcard | Player | Stand | Hit | Double | Split (DAS=No) | Split (DAS=Yes) | Probability |
|---|---|---|---|---|---|---|---|
| 10 | 8,8 | -0.529565 | -0.526181 | -1.052362 | -0.474649 | -0.463745 | 0.00151018 |
| 6 | A,A | -0.103203 | 0.194397 | 0.227011 | 0.709899 | 0.709899 | 0.00041002 |
| 4 | 4,4 | -0.177078 | 0.065674 | -0.014834 | -0.062806 | 0.059604 | 0.00030752 |
| 6 | 9,9 | 0.213138 | -0.603261 | -1.206521 | 0.376538 | 0.435645 | 0.00041002 |
| 10 | 10,10 | 0.568553 | -0.843225 | -1.686450 | -0.415431 | -0.415431 | 0.02507978 |

**6 decks, S17**

| Upcard | Player | Stand | Hit | Double | Probability |
|---|---|---|---|---|---|
| 10 | 10,6 | -0.540954 | -0.534676 | -1.069351 | 0.01342288 |
| 10 | 9,7 | -0.536809 | -0.535392 | -1.070784 | 0.00339104 |
| 2 | 10,2 | -0.295821 | -0.251852 | -0.503704 | 0.00352341 |
| 3 | 10,2 | -0.254531 | -0.231352 | -0.462705 | 0.00367661 |
| 4 | 10,2 | -0.211115 | -0.210364 | -0.420729 | 0.00367661 |
| A | 6,5 | -0.661883 | 0.147596 | 0.129710 | 0.00063359 |
| A | 8,3 | -0.664365 | 0.147278 | 0.124094 | 0.00063359 |
| 2 | 5,4 | -0.289477 | 0.077895 | 0.070195 | 0.00091915 |
| 2 | 7,A | 0.124001 | 0.063289 | 0.120980 | 0.00091915 |
| 4 | 3,A | -0.204426 | 0.081740 | 0.066904 | 0.00091915 |
| 10 | 6,4 | -0.542043 | 0.026796 | -0.005603 | 0.00339104 |
| 10 | 10,A | 1.500000 | 0.117057 | 0.173198 | 0.01346998 |

| Upcard | Player | Stand | Hit | Double | Split (DAS=No) | Split (DAS=Yes) | Probability |
|---|---|---|---|---|---|---|---|
| 10 | 8,8 | -0.536853 | -0.535361 | -1.070722 | -0.486276 | -0.475385 | 0.00162488 |
| 6 | A,A | -0.145699 | 0.187973 | 0.190709 | 0.682366 | 0.682366 | 0.00044043 |
| 4 | 4,4 | -0.202102 | 0.048027 | -0.049346 | -0.105325 | 0.003626 | 0.00040372 |
| 6 | 9,9 | 0.280805 | -0.604091 | -1.208183 | 0.404149 | 0.464217 | 0.00044043 |
| 10 | 10,10 | 0.559145 | -0.847142 | -1.694283 | -0.419582 | -0.419582 | 0.02628648 |

**6 decks, H17**

| Upcard | Player | Stand | Hit | Double | Probability |
|---|---|---|---|---|---|
| 10 | 10,6 | -0.540954 | -0.534676 | -1.069351 | 0.01342288 |
| 10 | 9,7 | -0.536809 | -0.535392 | -1.070784 | 0.00339104 |
| 2 | 10,2 | -0.289435 | -0.252224 | -0.504448 | 0.00352341 |
| 3 | 10,2 | -0.248923 | -0.231678 | -0.463355 | 0.00367661 |
| 4 | 10,2 | -0.205906 | -0.210664 | -0.421329 | 0.00367661 |
| A | 6,5 | -0.595078 | 0.108668 | 0.124007 | 0.00063359 |
| A | 8,3 | -0.595490 | 0.107445 | 0.118796 | 0.00063359 |
| 2 | 5,4 | -0.283253 | 0.075786 | 0.068039 | 0.00091915 |
| 2 | 7,A | 0.113110 | 0.060441 | 0.116262 | 0.00091915 |
| 4 | 3,A | -0.199215 | 0.082777 | 0.069716 | 0.00091915 |
| 10 | 6,4 | -0.542043 | 0.026796 | -0.005603 | 0.00339104 |
| 10 | 10,A | 1.500000 | 0.117057 | 0.173198 | 0.01346998 |

| Upcard | Player | Stand | Hit | Double | Split (DAS=No) | Split (DAS=Yes) | Probability |
|---|---|---|---|---|---|---|---|
| 10 | 8,8 | -0.536853 | -0.535361 | -1.070722 | -0.486276 | -0.475385 | 0.00162488 |
| 6 | A,A | -0.115159 | 0.189536 | 0.206312 | 0.679649 | 0.679649 | 0.00044043 |
| 4 | 4,4 | -0.196633 | 0.046322 | -0.050931 | -0.098932 | 0.010058 | 0.00040372 |
| 6 | 9,9 | 0.220168 | -0.610063 | -1.220125 | 0.393294 | 0.453097 | 0.00044043 |
| 10 | 10,10 | 0.559145 | -0.847142 | -1.694283 | -0.419582 | -0.419582 | 0.02628648 |

**What the cells say (useful as strategy-generator assertions):**

- **11 vs A.** 6,5 vs A: double in 2D S17/H17 and 6D H17, but hit in 6D S17 (0.147596 > 0.129710).
- **9 vs 2.** 5,4 vs 2: double in 2D, hit in 6D.
- **A,7 vs 2.** Stand in S17 (2D: 0.128632 > 0.123539). Double in H17 (2D: 0.119481 > 0.118882).
- **10 vs 10.** 6,4 vs 10: hit beats double in 2D (0.029897 vs 0.000806) and in 6D.
- **8,8 vs 10.** Splitting is best everywhere.
- **12 vs 4.** 10,2 vs 4: hitting is marginally best in 2D S17 (−0.203909 vs −0.211303), 2D H17 (−0.204205 vs −0.206125) and 6D S17 (−0.210364 vs −0.211115). In 6D H17, standing is best (−0.205906 vs −0.210664). This is a known composition-dependent exception, listed as "12 (10+2) vs 4 = Hit" on https://wizardofodds.com/games/blackjack/composition-dependent-strategy-two-deck-stand-soft-17/. That page also lists "11 (8+3) vs Ace = Hit" and "11 (9+2) vs Ace = Hit" for 2D S17, which matches the 8,3 row above. A total-dependent generator should still produce "stand 12 vs 4", so test the CD and TD outputs separately.
- **Upcard 10.** Rows with a 10 up are identical between S17 and H17.

The Ask the Wizard card-counting page (https://wizardofodds.com/ask-the-wizard/blackjack/card-counting/) gives 10+6 vs 10 against a *neutral* 8-deck shoe (one of each A–9 removed except no sixes, and two tens): Stand −0.5399, Hit −0.5399. The stand value is higher beyond four decimals. This illustrates why the Hi-Lo index for 16 vs 10 is 0.

---

## C. Overall house edge for standard rule sets

Source: Wizard of Odds *Blackjack House Edge Calculator*, https://wizardofodds.com/games/blackjack/calculator/

The calculator is JavaScript over a lookup table embedded in the page (`edgeTable[decks][soft17][DAS][double][resplit][RSA][hitSplitAces][OBO][surrender]`). The numbers below are **read from that embedded table and from the page's adjustment code**, not from the rendered output box. The page rounds its display to 5 decimals.

**Index meaning (from the form):**

- decks: 0=1, 1=2, 2=4, 3=5, 4=6, 5=8
- soft17: 0=stands, 1=hits
- DAS: 0=no, 1=yes
- double: 0=any first two cards
- resplit: 2=to 4 hands
- RSA: 0=no
- hit split aces: 0=no
- OBO ("Player loses only original bet against dealer BJ", i.e. peek / US hole card): 1=yes
- surrender: 0=none, 1=late
- Blackjack pays 3:2 in every row (6:5 adds a per-deck constant, e.g. +1.373499 for 2 decks).

**Common assumptions in every row below:** double any two cards, resplit to 4 hands, no resplitting aces, no hitting split aces, dealer peeks, 3:2.

**The three outputs, as the page defines them:**

- **Optimal**: "based on perfect composition dependent strategy and the dealer shuffling after every hand".
- **Basic strategy with cut card**: "total dependent basic strategy ... and the use of a cut card, which favors the dealer". It is computed as Optimal + 0.1517 / 0.0770 / 0.0395 / 0.0320 / 0.0231 / 0.0159 for 1 / 2 / 4 / 5 / 6 / 8 decks.
- **Basic strategy with CSM**: the cut-card figure − 0.113 / 0.063 / 0.034 / 0.028 / 0.020 / 0.014.

Positive values are a house edge; negative values are a player edge. The last two columns are exact decimal sums of the page's constants.

| Decks | Soft 17 | DAS | Surrender | edgeTable index | Optimal (CD, shuffle every hand) % | Basic strategy, cut card % | Basic strategy, CSM % |
|---|---|---|---|---|---|---|---|
| 2 | H17 | yes | none | `[1][1][1][0][2][0][0][1][0]` | 0.379879 | 0.456879 | 0.393879 |
| 2 | S17 | yes | none | `[1][0][1][0][2][0][0][1][0]` | 0.178315 | 0.255315 | 0.192315 |
| 2 | H17 | yes | late | `[1][1][1][0][2][0][0][1][1]` | 0.313717 | 0.390717 | 0.327717 |
| 2 | S17 | yes | late | `[1][0][1][0][2][0][0][1][1]` | 0.127162 | 0.204162 | 0.141162 |
| 2 | H17 | no | none | `[1][1][0][0][2][0][0][1][0]` | 0.525253 | 0.602253 | 0.539253 |
| 6 | H17 | yes | late | `[4][1][1][0][2][0][0][1][1]` | 0.527409 | 0.550509 | 0.530509 |
| 6 | S17 | yes | late | `[4][0][1][0][2][0][0][1][1]` | 0.330512 | 0.353612 | 0.333612 |
| 6 | H17 | yes | none | `[4][1][1][0][2][0][0][1][0]` | 0.615626 | 0.638726 | 0.618726 |
| 6 | S17 | yes | none | `[4][0][1][0][2][0][0][1][0]` | 0.403115 | 0.426215 | 0.406215 |
| 1 | S17 | yes | none | `[0][0][1][0][2][0][0][1][0]` | -0.182895 | -0.031195 | -0.144195 |
| 1 | S17 | no | none | `[0][0][0][0][2][0][0][1][0]` | -0.041620 | 0.110080 | -0.002920 |
| 1 | H17 | no | none | `[0][1][0][0][2][0][0][1][0]` | 0.151762 | 0.303462 | 0.190462 |
| 8 | H17 | yes | late | `[5][1][1][0][2][0][0][1][1]` | 0.553356 | 0.569256 | 0.555256 |
| 8 | S17 | yes | none | `[5][0][1][0][2][0][0][1][0]` | 0.430961 | 0.446861 | 0.432861 |

**Cross-checks:**

- The Appendix 9 game EVs (B3), which are composition-dependent with no surrender, agree with the "Optimal" column to within about 0.0005 percentage points. For example, 6D S17 DAS is −0.004026 there and 0.403115% here; 2D H17 DAS is −0.003797 there and 0.379879% here.
- Which column to test against: the TD-strategy, shuffle-every-hand engine should target the **CSM** column. A simulation with a cut card should target the **cut card** column.

---

## D. Hi-Lo Illustrious 18 and Fab 4

Source: Wizard of Odds, *Introduction to the High-Low Card Counting Strategy*, https://wizardofodds.com/games/blackjack/card-counting/high-low/. The tables are "republished here with permission" from Don Schlesinger, *Blackjack Attack*, page 62, 2004 ed.

The page does not state S17/H17 or deck count for the indices themselves. It says "Knowing only these will give the counter 80% to 85% of the value of knowing every index number, based on a six-deck game." These are the commonly quoted multi-deck figures; treat them as multi-deck, S17-era values.

Decision rule quoted from the page: "The player should stand/double/split if the True Count equals or exceeds the Index Number, otherwise hit. The player should take insurance if the True Count is +3 or greater."

| Order | Play | Index |
|---|---|---|
| 1 | Insurance | +3 |
| 2 | 16 Vs. 10 | +0 |
| 3 | 15 Vs. 10 | +4 |
| 4 | 10,10 Vs. 5 | +5 |
| 5 | 10,10 Vs. 6 | +4 |
| 6 | 10 Vs. 10 | +4 |
| 7 | 12 Vs. 3 | +2 |
| 8 | 12 Vs. 2 | +3 |
| 9 | 11 Vs. A | +1 |
| 10 | 9 Vs. 2 | +1 |
| 11 | 10 Vs. A | +4 |
| 12 | 9 Vs. 7 | +3 |
| 13 | 16 Vs. 9 | +5 |
| 14 | 13 Vs. 2 | -1 |
| 15 | 12 Vs. 4 | 0 |
| 16 | 12 Vs. 5 | -2 |
| 17 | 12 Vs. 6 | -1 |
| 18 | 13 Vs. 3 | -2 |

Fab 4 surrenders ("The player should surrender if the True Count equals or exceeds the Index Number"):

| Order | Play | Index |
|---|---|---|
| 1 | 14 Vs. 10 | +3 |
| 2 | 15 Vs. 10 | +0 |
| 3 | 15 Vs. 9 | +2 |
| 4 | 15 Vs. A | +1 |

**Not sourced in this session:**

- H17 versions. 11 vs A, 15 vs A, 16 vs A and similar indices differ under H17; Blackjack Apprenticeship and *Blackjack Attack* were unreachable.
- 2-deck-specific Illustrious 18 values.

For both, use the app's own index generator (SPEC 3.5) and do not hard-code general-knowledge values as tests.

**Hi-Lo simulation reference (same page, from CVCX).** The rules quoted are "Six decks Dealer stands on soft 17 Surrender allowed Double after split allowed Player may resplit to four hands, including aces". The bet ramp rises only after a win and falls only after a loss. Remaining decks are rounded to the nearest half deck. A selection of rows:

| Spread | Penetration (decks) | Indices | Player Adv. | Std. Dev. | Avg. Bet |
|---|---|---|---|---|---|
| 1 to 5 | 4.5 | I18+F4 | 0.300% | 1.60 | 1.41 |
| 1 to 10 | 4.5 | I18+F4 | 0.587% | 2.27 | 1.68 |
| 1 to 10 | 4.5 | All | 0.608% | 2.29 | 1.68 |
| 1 to 15 | 5 | All | 1.182% | 3.54 | 2.11 |

The win/loss-dependent ramp is unusual, so these rows are useful as order-of-magnitude checks only.

---

## E. Effects of removal (basic strategy)

### E1. Six decks: DAS, split once, strategy re-optimised (Appendix 7)

Source: https://wizardofodds.com/games/blackjack/effect-of-removal/

Rules quoted from the page: "removing one of each given card from a six-deck shoe ... Double on any two cards, double after split allowed, split anything only once, and strategy adjustments for the changed deck composition." The page credits its source as "the Composition Dependent Combinatorial Analyzer at bjstrat.net." Each value is the change in **player** EV from removing one card.

| Card | Stand Soft 17 | Hit Soft 17 |
|---|---|---|
| 2 | 0.069% | 0.071% |
| 3 | 0.082% | 0.086% |
| 4 | 0.110% | 0.117% |
| 5 | 0.141% | 0.143% |
| 6 | 0.079% | 0.084% |
| 7 | 0.041% | 0.038% |
| 8 | -0.008% | -0.010% |
| 9 | -0.040% | -0.045% |
| 10 | -0.091% | -0.097% |
| Ace | -0.094% | -0.084% |

Sanity check: summed over a whole deck (four tens), S17 gives +0.016%. This is close to 0 but not exactly 0, because the strategy is re-optimised after each removal and the values are rounded.

### E2. Six decks, "liberal Strip rules" (Ask the Wizard)

Source: https://wizardofodds.com/ask-the-wizard/blackjack/ (also on /ask-the-wizard/blackjack/card-counting/).

Rules quoted from the page: "double after split, late surrender, and re-splitting pairs (including aces) up to three times". The page's example: "if the dealer stands on soft 17, and the burn card is a five, then the house edge drops by 0.146%."

**Data-quality warning.** The table as published has **two rows labelled "2"**: 0.069%/0.071%, then 0.070%/0.072%. The rows for 3 through Ace are 3: 0.084/0.089, 4: 0.114/0.122, 5: 0.146/0.148, 6: 0.079/0.085, 7: 0.041/0.038, 8: −0.010/−0.012, 9: −0.041/−0.046, 10: −0.092/−0.098, Ace: −0.101/−0.091 (S17/H17, %). The first "2" row is identical to E1's 2 row and looks like a copy-paste remnant. **Use E1 for tests.**

### E3. Griffin single-deck EORs: not sourced

*Theory of Blackjack* was not reachable. Use E1, or compute your own EORs and compare their *shape* with E1: 5 largest positive, ten and ace most negative, 8 near zero.

---

## F. Side bets

All sources are Wizard of Odds pages. "Return" is per unit bet; house edge = −Total return. Card counts are full 52-card decks.

### F1. Perfect Pairs (version 1: first two player cards)

Source: https://wizardofodds.com/games/blackjack/side-bets/perfect-pairs/

Definitions quoted from the page: "A 'perfect pair' is two identical cards (like two ace of spades). A 'colored pair' is two cards of the same rank and color". A red/black pair means same rank, different colours.

Pay tables (perfect / colored / mixed):

- A = 25/12/6 (Evolution live dealer)
- B = 30/10/5
- C = 25/12/5
- D = 25/15/5

Full return table, Pay Table A, 8 decks:

| Hand | Pays | Combinations | Probability | Return |
|---|---|---|---|---|
| Perfect pair | 25 | 1456 | 0.016867 | 0.421687 |
| Colored pair | 12 | 1664 | 0.019277 | 0.231325 |
| Red/black pair | 6 | 3328 | 0.038554 | 0.231325 |
| Non-pair | -1 | 79872 | 0.925301 | -0.925301 |
| Total |  | 86320 | 1 | -0.040964 |

Expected return by decks:

| Decks | Pay Table A (25/12/6) | Pay Table B | Pay Table C | Pay Table D |
|---|---|---|---|---|
| 2 | -0.223301 | -0.252427 | -0.262136 | -0.203883 |
| 4 | -0.101449 | -0.106280 | -0.140097 | -0.082126 |
| 5 | -0.077220 | -0.077220 | -0.115830 | -0.057915 |
| 6 | -0.061093 | -0.057878 | -0.099678 | -0.041801 |
| 8 | -0.040964 | -0.033735 | -0.079518 | -0.021687 |

The requested anchor, **25/12/6 with 6 decks, is −0.061093 (house edge 6.11%)**. Combinatorial check for 8 decks: perfect pairs = 52·C(8,2) = 1456 out of C(416,2) = 86320.

### F2. 21+3 (player's two cards plus dealer upcard as a 3-card poker hand)

Source: https://wizardofodds.com/games/blackjack/side-bets/21plus3/

**Version 1** ("Las Vegas Hilton": flush, straight, straight flush, or trips all pay 9 to 1), 6 decks:

| Hand | Combinations | Probability | Pays | Return |
|---|---|---|---|---|
| Straight flush | 10368 | 0.002068 | 9 to 1 | 0.018613 |
| Three of a kind | 26312 | 0.005248 | 9 to 1 | 0.047236 |
| Straight | 155520 | 0.031021 | 9 to 1 | 0.279192 |
| Flush | 236736 | 0.047221 | 9 to 1 | 0.424993 |
| Pair+flush | 56160 | 0.011202 | 9 to 1 | 0.100819 |
| Pair (no flush) | 977184 | 0.194918 | Loss | -0.194918 |
| Nothing | 3551040 | 0.708321 | Loss | -0.708321 |
| Total | 5013320 | 1 |  | -0.032386 |

Version 1 house edge by decks: 1 deck 13.30%, 2 decks 7.26%, 4 decks 4.24%, 6 decks 3.24%, 8 decks 2.74%.

**Version 4 "21+3 Xtreme"** (straight flush 30, trips 20, straight 10, flush 5), 6 decks: total −0.133896. By decks: 1 −0.227330, 2 −0.172736, 4 −0.143780, 5 −0.137863, 6 −0.133896, 8 −0.128912.

**Version 5** (Evolution: suited trips 100, straight flush 40, trips 25, straight 10, flush 5), 8 decks: total −0.062882. Other deck counts: 4 decks 8.78%, 5 decks 7.81%, 6 decks 7.14%, 7 decks 6.29%.

**Version 7** (as version 5 but trips 30), 8 decks: total −0.037039. Four decks 6.39%, six decks 3.70%.

**6-deck category counts, useful for engine tests:**

- Straight flush 10368
- Straight 155520
- All flushes 292896 (= 236736 + 56160)
- Three of a kind 26312, of which suited trips 1040 and unsuited trips 25272 (both shown in Version 3)
- Total C(312,3) = 5013320

### F3. Lucky Ladies (player's first two cards total 20)

Source: https://wizardofodds.com/games/blackjack/side-bets/lucky-ladies/

"A 'matched pair' means the same card in both rank and suit." The page uses the word "Permutations" for these counts.

**Pay Table A:** Q♥ pair with dealer BJ 1000, Q♥ pair 125, matched 20 19, suited 20 9, unsuited 20 4.

Full return table, 6 decks:

| Hand | Permutations | Probability | Pays | Return |
|---|---|---|---|---|
| Q of hearts pair & dealer has BJ | 135360 | 0.000015 | 1000 to 1 | 0.014563 |
| Q of hearts pair | 2738340 | 0.000295 | 125 to 1 | 0.036827 |
| Matched 20 (same rank and suit) | 43105500 | 0.004638 | 19 to 1 | 0.088115 |
| Suited 20 | 193112640 | 0.020777 | 9 to 1 | 0.186990 |
| Unsuited 20 | 744863040 | 0.080139 | 4 to 1 | 0.320554 |
| Non-20 | 8310740400 | 0.894138 | Loss | -0.894138 |
| Total | 9294695280 | 1.000000 |  | -0.247089 |

House edge summary (the page's table):

| Decks | A | B (1000/200/25/10/4) | C (1 deck design) | D | E |
|---|---|---|---|---|---|
| 2 | 30.05% | 24.94% | 25.51% | 12.66% | 11.37% |
| 4 | 26.04% | 19.46% | 23.35% | 7.82% | 7.24% |
| 6 | 24.71% | 17.64% | 22.64% | 6.22% | 5.87% |
| 8 | 24.05% | 16.73% | 22.28% | 5.42% | 5.19% |

Pay Table C with 1 deck: 29.89%.

**Pay Table D** (Q♥ pair 100, matched 20 30, suited 20 10, any 20 3, one queen 1), 6 decks. Combinations out of 48,516:

| Hand | Combinations |
|---|---|
| Q♥ pair | 15 |
| Matched 20 | 225 |
| Suited 20 | 1,008 |
| Any 20 | 3,888 |
| One queen | 5,184 |

Total return −0.062206.

### F4. Match the Dealer (either player card matches the dealer upcard's rank)

Source: https://wizardofodds.com/games/blackjack/side-bets/match-the-dealer/

Pay tables by decks (unsuited / suited, to 1): 2D 4/19, 4D 4/12, 5D 3/15, 6D 4/11, 8D 3/14. A suited match is a match in both rank and suit. Double matches pay the sum of the two individual pays: this is inferred from the printed pays 38 = 19+19, 23 = 19+4 and 8 = 4+4, not stated on the page.

**2 decks, 4/19** (the denominator 5,253 = C(103,2)):

| Event | Pays | Permutations | Probability | Return |
|---|---|---|---|---|
| Two suited matches | 38 | - | 0.000000 | 0.000000 |
| One suited and one non-suited match | 23 | 6 | 0.001142 | 0.026271 |
| One suited match | 19 | 96 | 0.018275 | 0.347230 |
| Two non-suited matches | 8 | 15 | 0.002856 | 0.022844 |
| One non-suited match | 4 | 576 | 0.109652 | 0.438607 |
| No matches | -1 | 4,560 | 0.868075 | -0.868075 |
| Total |  | 5,253 | 1.000000 | -0.033124 |

**6 decks, 4/11:**

| Event | Pays | Permutations | Probability | Return |
|---|---|---|---|---|
| Two suited matches | 22 | 10 | 0.000207 | 0.004564 |
| One suited and one non-suited match | 15 | 90 | 0.001867 | 0.028005 |
| One suited match | 11 | 1,440 | 0.029872 | 0.328597 |
| Two non-suited matches | 8 | 153 | 0.003174 | 0.025392 |
| One non-suited match | 4 | 5,184 | 0.107541 | 0.430163 |
| No matches | -1 | 41,328 | 0.857338 | -0.857338 |
| Total |  | 48,205 | 1.000000 | -0.040618 |

Other totals: 4D 4/12 −0.048403; 5D 3/15 −0.047589; 8D 3/14 −0.036738.

### F5. Buster Blackjack (pays when the dealer busts, by number of cards in the busted hand)

Source: https://wizardofodds.com/games/blackjack/side-bets/buster-blackjack/

The page notes: "This table uses a 6-card pay of 12 to 1, not the 15 to 1 in the Version 1 pay table above ... At 15 to 1 the house edge would be 5.42%." So the analysed pay table is 8+ cards 250, 7 cards 50, 6 cards 12, 5 cards 4, 3 or 4 cards 2.

Six decks, H17:

| Event | Pays | Probability | Return |
|---|---|---|---|
| Bust with 8 cards | 250 | 0.000012 | 0.002986 |
| Bust with 7 cards | 50 | 0.000214 | 0.010722 |
| Bust with 6 cards | 12 | 0.002638 | 0.031651 |
| Bust with 5 cards | 4 | 0.020473 | 0.08189 |
| Bust with 4 cards | 2 | 0.089392 | 0.178784 |
| Bust with 3 cards | 2 | 0.173032 | 0.346064 |
| Dealer doesn't bust | -1 | 0.714241 | -0.714241 |
| Total |  | 1.000000 | -0.062143 |

House edge by decks, same 12-to-1 pay table:

| Decks | Stand on Soft 17 | Hit on Soft 17 |
|---|---|---|
| 1 | 8.77% | 6.89% |
| 2 | 8.48% | 6.51% |
| 4 | 8.31% | 6.29% |
| 5 | 8.27% | 6.25% |
| 6 | 8.25% | 6.21% |
| 8 | 8.22% | 6.17% |

**Cross-check against A1.** Bust-with-3-cards 0.173032 and bust-with-4-cards 0.089392 (H17) match A1's six-deck table (0.1730318…, 0.0893918…). A1's six-deck breakdown is over all rounds, with dealer blackjack counted as a non-bust. Version 2 on the Buster page says explicitly that the dealer plays out the hand even when the player has blackjack.

### F6. Royal Match (first two player cards suited; K-Q suited pays more)

Source: https://wizardofodds.com/games/blackjack/side-bets/royal-match/

**Version 1** (royal 25, easy match 2.5), 6 decks:

| Event | Pays | Combinations | Probability | Return |
|---|---|---|---|---|
| Royal match | 25 | 144 | 0.002968 | 0.074202 |
| Easy match | 2.5 | 11,868 | 0.244620 | 0.611551 |
| No match | -1 | 36,504 | 0.752412 | -0.752412 |
| Total |  | 48,516 | 1.000000 | -0.066658 |

House edge by decks. Version 2 pays royal 10 and easy match 3; a negative value is a player edge.

| Decks | Version 1 | Version 2 |
|---|---|---|
| 1 | 0.108597 | 0.037707 |
| 2 | 0.083271 | 0.008215 |
| 4 | 0.070792 | -0.006317 |
| 6 | 0.066658 | -0.011130 |
| 8 | 0.064597 | -0.013531 |

The page gives closed forms with n decks: P(royal) = 4n² / C(52n,2) and P(easy) = 4(C(13n,2) − n²) / C(52n,2).

### F7. Pair bets with specific-card jackpots, and other pair bets

**KK side bet.** Source: https://wizardofodds.com/article/kk-blackjack-side-bet/. The JJ and QQ versions are the same bet with the rank substituted. Pay table: king of diamonds pair 200, matched 20 20, any other 20 4, one king (not a 20) 1.

| Event | Pays | 6D combinations | 6D probability | 8D combinations | 8D probability |
|---|---|---|---|---|---|
| King of diamonds pair | 200 | 15 | 0.000309 | 28 | 0.000324 |
| Matched 20 | 20 | 225 | 0.004638 | 420 | 0.004866 |
| Any 20 | 4 | 4896 | 0.100915 | 8704 | 0.100834 |
| One king | 1 | 5184 | 0.106851 | 9216 | 0.106766 |
| All other | -1 | 38196 | 0.787287 | 67952 | 0.787210 |
| Total return |  | 48516 | −0.122186 | 86320 | −0.114921 |

**Pair Square / Bet the Set / Any Pair.** Source: https://wizardofodds.com/games/blackjack/side-bets/pair-square/. 6 decks, 12-10 pay table (suited pair 12, other pair 10): suited pair 780, non-suited pair 2808, no pair 44928, out of 48516. Total −0.154341.

**Pair 'Em Up / Suit 'Em Up.** Source: https://wizardofodds.com/games/blackjack/side-bets/pair-em-up/. The payout depends on rank: suited aces 40, suited 10-K 20, …, unsuited 2s 2. 6 decks total −0.205788. House edge 2D 31.07%, 4D 23.19%, 6D 20.58%.

**"Pair" (Venetian 2024: player two cards plus dealer upcard).** Source: https://wizardofodds.com/games/pair-blackjack-side-bet/. Pays trips 30, player pair 5, upcard pairs a player card 2. 2 decks total −0.108509. House edge 1D 24.94%, 2D 10.85%, 6D 1.28%, 8D 0.08%.

---

## G. Notes for the test author

1. **Conditioning matters.**
   - A1 and B are conditioned on no dealer blackjack.
   - A2 is not.
   - The A2 tables remove only the upcard. B3 removes the player's two cards and the upcard, and also conditions on the hole card not giving blackjack.
2. **Tolerances.** Wizard's 6-decimal values come from exact combinatorial programs, so a correct engine should match B1/B3 stand, hit and double cells to about 1e-6. Split cells depend on the split approximation: Wizard's CD tables track only "how many hands the player had already split". Use a looser tolerance there, around 1e-3.
3. **Two Wizard sources for the same game differ slightly.** The calculator's "Optimal" (C) and the Appendix 9 game EVs (B3) differ by about 0.0005 percentage points. Do not demand closer agreement than that.
4. **Unsourced in this session:**
   - H17 Illustrious 18 / Fab 4
   - Griffin single-deck EORs
   - Any Jacobson figures
   - Infinite-deck dealer-outcome tables as a separate table
