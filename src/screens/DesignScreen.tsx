import { useState } from 'react';
import { TopBar, Button, Box, Instrument, Instruments, Seg, Switch, CardTile, Hand, fmtSigned } from '../ui/components';
import { makeCard } from '../engine/cards';

/** Living style guide for the design system. */
export function DesignScreen() {
  const [seg, setSeg] = useState('a');
  const [sw, setSw] = useState(true);
  return (
    <>
      <TopBar title="Design" />
      <main className="stack">
        <h2 className="display">Aa 0123</h2>
        <p className="mono">JetBrains Mono · 0123456789 +0.0412</p>
        <Box title="Cards">
          <div className="row">
            <CardTile card={makeCard(0, 0)} size="lg" />
            <CardTile card={makeCard(12, 1)} size="lg" />
            <CardTile card={makeCard(9, 2)} size="lg" />
            <CardTile card={makeCard(6, 3)} size="lg" />
            <CardTile faceDown size="lg" />
          </div>
          <div style={{ marginTop: 'var(--s4)' }}>
            <Hand cards={[makeCard(0, 1), makeCard(5, 0), makeCard(11, 2)]} />
          </div>
        </Box>
        <Instruments>
          <Instrument label="Running" value="+7" />
          <Instrument label="True" value="+3.5" unit="1.5 decks left" />
          <Instrument label="EV stand" value={fmtSigned(-0.1523, 3)} unit="units" />
          <Instrument label="EV double" value={fmtSigned(0.2131, 3)} tone="pos" unit="units" />
          <Instrument label="Lost" value={fmtSigned(-0.42, 2)} tone="bad" unit="units" />
        </Instruments>
        <div className="row">
          <Button variant="primary">Primary</Button>
          <Button>Default</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Error</Button>
        </div>
        <Seg options={[{ value: 'a', label: 'HIT' }, { value: 'b', label: 'STAND' }, { value: 'c', label: 'DOUBLE' }]} value={seg} onChange={setSeg} />
        <div className="row">
          <Switch checked={sw} onChange={setSw} label="demo" /> <span className="tag">tag</span> <span className="tag bad">error</span>{' '}
          <span className="tag good">+EV</span>
        </div>
      </main>
    </>
  );
}
