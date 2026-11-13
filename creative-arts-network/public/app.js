
function renderGraph() {
  const svg = $('graph');
  svg.replaceChildren();
  svg.setAttribute('viewBox', '0 0 1100 760');

  const center = state.nodes.find(n => n.id === state.focus);
  if (!center) return;

  const one = [...new Set(connections(center.id))]
    .map(id => state.nodes.find(n => n.id === id))
    .filter(Boolean);

  let second = [];

  if (state.second) {
    const seen = new Set([center.id, ...one.map(n => n.id)]);

    for (const n of one) {
      for (const id of connections(n.id)) {
        if (!seen.has(id)) {
          seen.add(id);
          const match = state.nodes.find(x => x.id === id);
          if (match) second.push(match);
        }
      }
    }

    second = second.slice(0, 22);
  }

  const colours = {
    Unit: ['#E5F0F5', '#366F8A'],
    Staff: ['#F7EEDF', '#A47B43'],
    Major: ['#F0EAF5', '#846C97'],
    Semester: ['#E5F2EE', '#477D77'],
    Day: ['#E5F2EE', '#477D77'],
    'Unit Type': ['#F0EFE8', '#8E8D7C']
  };

  const positions = new Map();
  const cx = 550;
  const cy = 375;

  positions.set(center.id, { x: cx, y: cy });

  function positionRing(nodes, rx, ry) {
    nodes.forEach((n, i) => {
      const angle = -Math.PI / 2 +
        (2 * Math.PI * i / nodes.length);

      positions.set(n.id, {
        x: cx + rx * Math.cos(angle),
        y: cy + ry * Math.sin(angle)
      });
    });
  }

  positionRing(one, 310, 225);
  positionRing(second, 485, 345);

  // Draw connections behind the labels.
  for (const e of state.edges) {
    const a = positions.get(e.source);
    const b = positions.get(e.target);

    if (!a || !b) continue;

    const isSecond = second.some(n =>
      n.id === e.source || n.id === e.target
    );

    svg.appendChild(el('line', {
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      stroke: isSecond ? '#BAC9CE' : '#65818B',
      'stroke-width': isSecond ? 1.2 : 2.2,
      'stroke-dasharray': isSecond ? '4 5' : 'none',
      opacity: isSecond ? 0.4 : 0.85
    }));
  }

  // Every node is now a bordered label.
  for (const n of [...second, ...one, center]) {
    const p = positions.get(n.id);
    const central = n.id === center.id;
    const secondary = second.includes(n);

    const label = nodeName(n);
    const colour = colours[n.kind] || ['#FFFFFF', '#879BA3'];

    const fontSize = central ? 17 : secondary ? 11 : 13;
    const maxWidth = central ? 235 : secondary ? 125 : 155;
    const width = Math.min(
      maxWidth,
      Math.max(65, label.length * fontSize * 0.59 + 24)
    );

    const height = central ? 54 : secondary ? 29 : 35;
    const x = p.x - width / 2;
    const y = p.y - height / 2;

    const g = el('g', {
      class: 'graphnode' + (central ? ' central' : ''),
      tabindex: '0',
      role: 'button',
      'aria-label': `${n.label} - select node`
    });

    const rect = el('rect', {
      x, y,
      width,
      height,
      rx: 8,
      fill: colour[0],
      stroke: colour[1],
      'stroke-width': central ? 2.5 : 1.5
    });

    g.appendChild(rect);

    const maxChars = Math.floor(
      (width - 18) / (fontSize * 0.57)
    );

    const displayLabel = label.length > maxChars
      ? label.slice(0, Math.max(1, maxChars - 1)) + '…'
      : label;

    const text = el('text', {
      x: p.x,
      y: p.y + fontSize * 0.35,
      'text-anchor': 'middle',
      'font-size': fontSize,
      'font-weight': central ? 750 : 650,
      fill: '#213340',
      'pointer-events': 'none'
    }, displayLabel);

    g.appendChild(text);
    g.appendChild(el('title', {}, n.label));

    g.addEventListener('click', () => focusNode(n.id));

    g.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        focusNode(n.id);
      }
    });

    svg.appendChild(g);
  }

  $('graphTitle').textContent = center.label;
  $('count').textContent = `${one.length} direct connections`;

  $('graphnote').textContent = state.second
    ? 'Solid lines: direct relationships. Dashed lines: second-degree relationships.'
    : 'Click any connected label to explore its relationships.';
}
