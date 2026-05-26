(function () {
  // ── Constants ────────────────────────────────────────────────────────────

  const CLASS_COLORS = {
    '1 - Culturas perenes':          '#E69F00',
    '2 - Soja':                      '#F0E442',
    '3 - Soja + Milho 2ª safra':     '#D55E00',
    '4 - Milho 1ª safra':            '#009E73',
    '5 - Cana-de-açúcar':            '#56B4E9',
    '6 - Outra agropecuária':        '#999933',
    '7 - Pastagem deg. média':       '#CC79A7',
    '8 - Pastagem deg. alta':        '#882255',
    '9 - Pastagem deg. baixa':       '#AA4499',
    '10 - Silvicultura':             '#332288',
    '11 - Veg. prim. florestal':     '#117733',
    '12 - Veg. sec. florestal':      '#44AA99',
    '13 - Veg. prim. não-florestal': '#88CCEE',
    '14 - Veg. sec. não-florestal':  '#DDCC77',
    '15 - Outro':                    '#BBBBBB',
  };

  const ANCHOR_PERIODS = [
    { from: 2008, to: 2017, label: '2008 → 2017' },
    { from: 2017, to: 2024, label: '2017 → 2024' },
    { from: 2008, to: 2024, label: '2008 → 2024' },
  ];

  const BIENNIAL_PAIRS = [];
  for (let y = 2008; y < 2024; y += 2) {
    BIENNIAL_PAIRS.push({ from: y, to: y + 2, label: `${y} → ${y + 2}` });
  }

  const ALL_YEARS = Array.from({ length: 17 }, (_, i) => 2008 + i);

  // ── State ────────────────────────────────────────────────────────────────

  let currentRgintId = null;
  let matrixData     = null;
  let currentMode    = 'annual';
  let yearFrom       = 2008;
  let yearTo         = 2024;

  // ── Hex → rgba helper ────────────────────────────────────────────────────

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  // ── View toggle wiring ───────────────────────────────────────────────────

  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      const seriesEl     = document.getElementById('series-view');
      const transitionEl = document.getElementById('transition-panel');
      if (view === 'series') {
        seriesEl.classList.remove('hidden');
        transitionEl.classList.add('hidden');
      } else {
        seriesEl.classList.add('hidden');
        transitionEl.classList.remove('hidden');
        if (currentRgintId) loadAndRender(currentRgintId);
      }
    });
  });

  // ── Mode selector wiring ─────────────────────────────────────────────────

  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      buildYearControls();
      drawSankey();
    });
  });

  // ── Year controls ────────────────────────────────────────────────────────

  function buildYearControls() {
    const el = document.getElementById('year-controls');
    el.innerHTML = '';

    if (currentMode === 'annual') {
      el.appendChild(makeSelect('De', ALL_YEARS, yearFrom, y => { yearFrom = y; drawSankey(); }));
      const arrow = document.createElement('span');
      arrow.className = 'year-arrow';
      arrow.textContent = '→';
      el.appendChild(arrow);
      el.appendChild(makeSelect('Para', ALL_YEARS, yearTo, y => { yearTo = y; drawSankey(); }));

    } else if (currentMode === 'biennial') {
      const pairs = BIENNIAL_PAIRS.map(p => ({ value: `${p.from}:${p.to}`, label: p.label }));
      const defaultPair = `${yearFrom}:${yearTo}`;
      el.appendChild(makeSelect('Período', pairs, defaultPair, v => {
        const [f, t] = v.split(':').map(Number);
        yearFrom = f; yearTo = t;
        drawSankey();
      }));

    } else {
      const pairs = ANCHOR_PERIODS.map(p => ({ value: `${p.from}:${p.to}`, label: p.label }));
      el.appendChild(makeSelect('Período', pairs, `${yearFrom}:${yearTo}`, v => {
        const [f, t] = v.split(':').map(Number);
        yearFrom = f; yearTo = t;
        drawSankey();
      }));
    }
  }

  function makeSelect(labelText, options, currentVal, onChange) {
    const wrap = document.createElement('span');
    const lbl  = document.createElement('label');
    lbl.textContent = labelText + ': ';
    const sel  = document.createElement('select');

    (typeof options[0] === 'object' ? options : options.map(v => ({ value: v, label: v }))).forEach(opt => {
      const o = document.createElement('option');
      o.value       = opt.value;
      o.textContent = opt.label;
      if (String(opt.value) === String(currentVal)) o.selected = true;
      sel.appendChild(o);
    });

    sel.addEventListener('change', () => onChange(
      typeof options[0] === 'number' ? Number(sel.value) : sel.value
    ));
    wrap.appendChild(lbl);
    wrap.appendChild(sel);
    return wrap;
  }

  // ── Load matrix data ─────────────────────────────────────────────────────

  function loadAndRender(rgintId) {
    if (matrixData && currentRgintId === rgintId) {
      buildYearControls();
      drawSankey();
      return;
    }
    currentRgintId = rgintId;
    matrixData     = null;
    showLoading();

    fetch((window.API_BASE || '') + `/api/rgint_matrix/${rgintId}`)
      .then(r => {
        if (!r.ok) throw new Error('no_matrix');
        return r.json();
      })
      .then(data => {
        matrixData = data;
        buildYearControls();
        drawSankey();
      })
      .catch(() => showNoData());
  }

  function showLoading() {
    const el = document.getElementById('transition-chart');
    el.innerHTML = '<div class="no-data-msg"><strong>Carregando...</strong></div>';
    document.getElementById('stable-area-bar').classList.add('hidden');
  }

  function showNoData() {
    const el = document.getElementById('transition-chart');
    el.innerHTML = `<div class="no-data-msg">
      <strong>Dados de transição não disponíveis</strong>
      <p>Execute o pipeline para gerar as matrizes interpoladas:</p>
      <code>python 06_interpolate_matrices.py</code>
    </div>`;
    document.getElementById('stable-area-bar').classList.add('hidden');
  }

  // ── Sankey drawing ───────────────────────────────────────────────────────

  function drawSankey() {
    if (!matrixData) return;

    const matrices = matrixData.matrices;
    if (!matrices) { showNoData(); return; }

    // Pick the target-year matrix — it represents transitions leading to that year
    const matrix = matrices[String(yearTo)];
    if (!matrix) { showNoData(); return; }

    const classes  = matrixData.classes || Object.keys(CLASS_COLORS);
    const classIdx = {};
    classes.forEach((c, i) => classIdx[c] = i);

    const sources = [], targets = [], values = [], linkColors = [];
    let stableTotal = 0, totalFlow = 0;

    for (const from_cls of classes) {
      const row = matrix[from_cls];
      if (!row) continue;
      for (const to_cls of classes) {
        const val = row[to_cls];
        if (!val || val <= 0) continue;
        if (from_cls === to_cls) {
          stableTotal += val;
          continue;
        }
        sources.push(classIdx[from_cls]);
        targets.push(classIdx[to_cls]);
        values.push(val);
        linkColors.push(hexToRgba(CLASS_COLORS[from_cls] || '#999', 0.38));
        totalFlow += val;
      }
    }

    updateStableBar(stableTotal, totalFlow);

    const chartEl = document.getElementById('transition-chart');
    const chartH  = Math.max(chartEl.clientHeight || 0, 380);

    if (sources.length === 0) {
      chartEl.innerHTML = `<div class="no-data-msg">
        <strong>Nenhuma transição entre classes neste período</strong>
        <p>Toda a área permaneceu na mesma classe de uso do solo.</p>
      </div>`;
      return;
    }

    const nodeColors = classes.map(c => CLASS_COLORS[c] || '#999');
    const title = matrixData._synthetic
      ? `Transições (sintéticas): ${yearFrom} → ${yearTo}`
      : `Transições: ${yearFrom} → ${yearTo}`;

    Plotly.react('transition-chart', [{
      type: 'sankey',
      arrangement: 'snap',
      node: {
        label:     classes,
        color:     nodeColors,
        pad:       12,
        thickness: 18,
        hovertemplate: '<b>%{label}</b><br>%{value:,.0f} ha<extra></extra>',
      },
      link: {
        source:        sources,
        target:        targets,
        value:         values,
        color:         linkColors,
        hovertemplate: '%{source.label} → %{target.label}<br><b>%{value:,.0f} ha</b><extra></extra>',
      },
    }], {
      title:  { text: title, font: { size: 13 }, x: 0.02 },
      height: chartH,
      autosize: true,
      margin: { t: 46, r: 14, b: 14, l: 14 },
      paper_bgcolor: '#fafaf8',
      plot_bgcolor:  '#fafaf8',
      font: { size: 10, color: '#333' },
    }, { responsive: true, displayModeBar: false });
  }

  function updateStableBar(stableHa, flowHa) {
    const bar = document.getElementById('stable-area-bar');
    if (stableHa <= 0) { bar.classList.add('hidden'); return; }
    const total = stableHa + (flowHa || 0);
    const pct   = total > 0 ? (stableHa / total * 100).toFixed(1) : '—';
    bar.innerHTML =
      `<span class="stable-label">Área estável (sem mudança de classe):</span>` +
      `<span class="stable-pct">${stableHa.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha</span>` +
      `<span style="color:#666">(${pct}% da área total)</span>`;
    bar.classList.remove('hidden');
  }

  // ── Public hook — called by dashboard.js after region loads ──────────────

  window.onRegionChanged = function (rgintId) {
    currentRgintId = rgintId;
    matrixData     = null;   // invalidate cache on region change
    const transitionEl = document.getElementById('transition-panel');
    if (!transitionEl.classList.contains('hidden')) {
      loadAndRender(rgintId);
    }
  };

  // ── Init year controls on startup ────────────────────────────────────────

  buildYearControls();
})();
