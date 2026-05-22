(function () {
  // Paleta Okabe-Ito + Paul Tol "Muted" — daltonico-segura (sem vermelho nem marrom)
  const CLASS_COLORS = {
    '1 - Culturas perenes':          '#E69F00',  // laranja-âmbar
    '2 - Soja':                      '#F0E442',  // amarelo
    '3 - Soja + Milho 2ª safra':     '#D55E00',  // vermelhão (distinto de vermelho)
    '4 - Milho 1ª safra':            '#009E73',  // verde-azulado
    '5 - Cana-de-açúcar':            '#56B4E9',  // azul celeste
    '6 - Outra agropecuária':        '#999933',  // oliva-amarelo
    '7 - Pastagem deg. média':       '#CC79A7',  // rosa-púrpura
    '8 - Pastagem deg. alta':        '#882255',  // púrpura escuro
    '9 - Pastagem deg. baixa':       '#AA4499',  // púrpura médio
    '10 - Silvicultura':             '#332288',  // índigo
    '11 - Veg. prim. florestal':     '#117733',  // verde escuro
    '12 - Veg. sec. florestal':      '#44AA99',  // teal
    '13 - Veg. prim. não-florestal': '#88CCEE',  // azul claro
    '14 - Veg. sec. não-florestal':  '#DDCC77',  // amarelo-quente
    '15 - Outro':                    '#BBBBBB',  // cinza
  };

  const BIOME_COLORS = {
    'Amazônia':      '#009E73',
    'Cerrado':       '#E69F00',
    'Mata Atlântica':'#0072B2',
    'Caatinga':      '#F0E442',
    'Pampa':         '#CC79A7',
  };

  // Source metadata: cores também daltonico-safe
  const SOURCE_META = {
    pipeline_diagonal:  { label: 'Pipeline MB/TC',      color: null,      dash: 'solid',   width: 3   },
    conab_pam:          { label: 'PAM / IBGE',           color: '#0072B2', dash: 'dot',     width: 2   },
    conab_cafe:         { label: 'CONAB Café',            color: '#D55E00', dash: 'dashdot', width: 2   },
    lapig_vigor:        { label: 'LAPIG Vigor',           color: '#009E73', dash: 'dash',    width: 2   },
    mb_pastagem_total:  { label: 'MB Pastagem Total',    color: '#882255', dash: 'dot',     width: 1.5 },
    mb_floresta_total:  { label: 'MB Floresta Total',    color: '#117733', dash: 'dot',     width: 1.5 },
    mb_savana_total:    { label: 'MB Savana Total',      color: '#999933', dash: 'dot',     width: 1.5 },
    tc_pastagem:        { label: 'TC Pastagem',          color: '#AA4499', dash: 'dash',    width: 1.5 },
    tc_floresta_prim:   { label: 'TC Floresta Primária', color: '#44AA99', dash: 'dash',    width: 1.5 },
    tc_floresta_sec:    { label: 'TC Floresta Sec.',     color: '#56B4E9', dash: 'dashdot', width: 1.5 },
    tc_nao_florestal:   { label: 'TC Não-Florestal',    color: '#DDCC77', dash: 'dash',    width: 1.5 },
  };

  // Agrupamento temático das 15 classes
  const CLASS_GROUPS = [
    { label: 'Culturas Anuais',    classes: ['2 - Soja', '3 - Soja + Milho 2ª safra', '4 - Milho 1ª safra', '5 - Cana-de-açúcar'] },
    { label: 'Outras Culturas',    classes: ['1 - Culturas perenes', '6 - Outra agropecuária'] },
    { label: 'Pastagem',           classes: ['9 - Pastagem deg. baixa', '7 - Pastagem deg. média', '8 - Pastagem deg. alta'] },
    { label: 'Florestas',          classes: ['11 - Veg. prim. florestal', '12 - Veg. sec. florestal', '10 - Silvicultura'] },
    { label: 'Veg. Não-Florestal', classes: ['13 - Veg. prim. não-florestal', '14 - Veg. sec. não-florestal'] },
    { label: 'Outros',             classes: ['15 - Outro'] },
  ];

  let currentData    = null;
  let currentFormat  = null;
  let activeClass    = null;
  let currentRgintId = null;
  let currentNome    = null;

  // ── Colour helpers ──────────────────────────────────────────────────────

  function isLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  // ── Tab bar ─────────────────────────────────────────────────────────────

  function getSourceCount(cls) {
    if (currentFormat === 'full' && currentData?.classes?.[cls]) {
      return Object.keys(currentData.classes[cls]).length;
    }
    return 1;
  }

  function makeTabBtn(cls) {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.cls = cls;
    btn.title = cls;

    const labelEl = document.createElement('span');
    labelEl.className = 'tab-btn-label';
    labelEl.textContent = cls;
    btn.appendChild(labelEl);

    const count = getSourceCount(cls);
    const badge = document.createElement('span');
    badge.className = 'src-count' + (count >= 3 ? ' rich' : count >= 2 ? ' multi' : '');
    badge.textContent = count;
    btn.appendChild(badge);

    btn.addEventListener('click', () => selectTab(cls));
    return btn;
  }

  function buildTabs(classes) {
    const bar = document.getElementById('class-tabs');
    bar.innerHTML = '';
    const classSet = new Set(classes);
    const rendered = new Set();

    CLASS_GROUPS.forEach(group => {
      const groupClasses = group.classes.filter(c => classSet.has(c));
      if (groupClasses.length === 0) return;

      const groupEl = document.createElement('div');
      groupEl.className = 'tab-group';

      const labelEl = document.createElement('span');
      labelEl.className = 'tab-group-label';
      labelEl.textContent = group.label;
      groupEl.appendChild(labelEl);

      groupClasses.forEach(cls => {
        groupEl.appendChild(makeTabBtn(cls));
        rendered.add(cls);
      });

      bar.appendChild(groupEl);
    });

    // Classes fora dos grupos conhecidos
    const extras = classes.filter(c => !rendered.has(c));
    if (extras.length > 0) {
      const groupEl = document.createElement('div');
      groupEl.className = 'tab-group';
      extras.forEach(cls => groupEl.appendChild(makeTabBtn(cls)));
      bar.appendChild(groupEl);
    }
  }

  function selectTab(cls) {
    activeClass = cls;
    document.querySelectorAll('.tab-btn').forEach(b => {
      const active = b.dataset.cls === cls;
      b.classList.toggle('active', active);
      if (active) {
        const color = CLASS_COLORS[cls] || '#666';
        b.style.background = color;
        b.style.color = isLight(color) ? '#111' : '#fff';
        b.style.borderColor = 'transparent';
      } else {
        b.style.background = '';
        b.style.color = '';
        b.style.borderColor = '';
      }
    });
    plotTimeSeries(cls);
  }

  // ── Source summary row ──────────────────────────────────────────────────

  function updateSourceSummary(cls, classData) {
    const el = document.getElementById('source-summary');
    if (!el || !classData) { if (el) el.classList.add('hidden'); return; }

    const sourceNames = Object.keys(classData);
    if (sourceNames.length <= 1) { el.classList.add('hidden'); return; }

    const baseColor = CLASS_COLORS[cls] || '#555';
    const pills = sourceNames.map(srcName => {
      const meta = SOURCE_META[srcName] || { label: srcName, color: null };
      const src  = classData[srcName];
      const dotColor = meta.color || baseColor;
      const badge = src.quality === 'primary' ? ' ★' : ' ↩';
      return `<span class="source-pill">` +
        `<span class="source-dot" style="background:${dotColor}"></span>` +
        `<span>${meta.label}${badge}</span>` +
        `</span>`;
    });

    const years = classData[sourceNames[0]]?.years || [];
    const yearRange = years.length ? `[${years[0]}–${years[years.length - 1]}]` : '';
    el.innerHTML = pills.join('') + (yearRange ? `<span style="margin-left:auto;opacity:0.6">${yearRange}</span>` : '');
    el.classList.remove('hidden');
  }

  // ── Plotting ────────────────────────────────────────────────────────────

  function plotTimeSeries(cls) {
    if (!currentData) return;

    const chartEl  = document.getElementById('chart');
    const chartH   = Math.max(chartEl.clientHeight || 0, 320);
    const baseColor = CLASS_COLORS[cls] || '#555';
    const regionLabel = currentRgintId && currentNome ? `${currentRgintId} — ${currentNome}` : '';
    const titleText   = regionLabel ? `${cls}  ·  ${regionLabel}` : cls;

    let traces = [];
    let isMultiSource = false;

    if (currentFormat === 'full') {
      // ── Multi-source format ────────────────────────────────────────────
      const classData = currentData.classes?.[cls];
      if (!classData) return;

      const sourceNames = Object.keys(classData);
      isMultiSource = sourceNames.length > 1;

      updateSourceSummary(cls, classData);

      sourceNames.forEach(srcName => {
        const src  = classData[srcName];
        const meta = SOURCE_META[srcName] || { label: srcName, color: null, dash: 'solid', width: 2 };
        const lineColor = meta.color || baseColor;
        const qualBadge = src.quality === 'primary' ? ' ★' : ' ↩';

        traces.push({
          x: src.years,
          y: src.values,
          type: 'scatter',
          mode: 'lines+markers',
          name: meta.label + qualBadge,
          line:   { color: lineColor, dash: meta.dash, width: meta.width },
          marker: { color: lineColor, size: 5 },
          hovertemplate: `<b>%{x}</b><br>%{y:,.1f} ha<br><i>${meta.label}</i><extra></extra>`,
        });
      });

    } else {
      // ── Simple / legacy format ({"2008": 123, ...}) ───────────────────
      const summaryEl = document.getElementById('source-summary');
      if (summaryEl) summaryEl.classList.add('hidden');

      const series = currentData[cls];
      if (!series) return;
      const years = Object.keys(series).map(Number).sort((a, b) => a - b);
      const areas = years.map(y => series[y]);

      traces.push({
        x: years,
        y: areas,
        type: 'scatter',
        mode: 'lines+markers',
        line:   { color: baseColor, width: 2.5 },
        marker: { color: baseColor, size: 6 },
        name: cls,
        hovertemplate: '<b>%{x}</b><br>%{y:,.1f} ha<extra></extra>',
      });
    }

    const layout = {
      title: { text: titleText, font: { size: 13 }, x: 0.02 },
      height: chartH,
      autosize: true,
      xaxis: {
        title: { text: 'Ano', font: { size: 12 } },
        tickmode: 'linear',
        dtick: 2,
        tickfont: { size: 11 },
        showgrid: true,
        gridcolor: '#e8e8e0',
        gridwidth: 1,
      },
      yaxis: {
        title: { text: 'Área (ha)', font: { size: 12 } },
        tickfont: { size: 11 },
        tickformat: ',.0f',
        showgrid: true,
        gridcolor: '#e8e8e0',
        gridwidth: 1,
      },
      margin: { t: 48, r: isMultiSource ? 170 : 20, b: 56, l: 90 },
      paper_bgcolor: '#fafaf8',
      plot_bgcolor:  '#fafaf8',
      hovermode: 'x unified',
      showlegend: isMultiSource,
      legend: isMultiSource ? {
        orientation: 'v',
        x: 1.02,
        y: 1,
        font: { size: 11 },
        bgcolor: 'rgba(250,250,248,0.92)',
        bordercolor: '#ddd',
        borderwidth: 1,
      } : {},
    };

    Plotly.react('chart', traces, layout, { responsive: true, displayModeBar: false });
  }

  // ── Load region (tries full endpoint first, falls back to simple) ───────

  window.loadRegion = function (rgintId, nome, uf, biome) {
    currentRgintId = rgintId;
    currentNome    = nome;

    const reportLink = document.getElementById('report-link');
    reportLink.href = (window.API_BASE||'') + `/report/${rgintId}`;
    reportLink.classList.remove('hidden');

    fetch((window.API_BASE||'') + `/api/rgint_full/${rgintId}`)
      .then(r => {
        if (!r.ok) throw new Error('no_full');
        return r.json();
      })
      .then(data => {
        currentData   = data;
        currentFormat = 'full';
        renderDashboard(rgintId, nome, uf, biome, Object.keys(data.classes));
      })
      .catch(() => {
        fetch((window.API_BASE||'') + `/api/rgint/${rgintId}`)
          .then(r => { if (!r.ok) throw new Error(`RGINT ${rgintId} not found`); return r.json(); })
          .then(data => {
            currentData   = data;
            currentFormat = 'simple';
            renderDashboard(rgintId, nome, uf, biome, Object.keys(data));
          })
          .catch(err => console.error('loadRegion error:', err));
      });
  };

  function renderDashboard(rgintId, nome, uf, biome, classes) {
    const badge = document.getElementById('region-badge');
    document.getElementById('badge-name').textContent = `${rgintId} — ${nome}`;

    const biomeEl    = document.getElementById('badge-biome');
    const biomeColor = BIOME_COLORS[biome] || '#555';
    biomeEl.textContent    = biome;
    biomeEl.style.background = biomeColor + '99';
    biomeEl.style.color      = isLight(biomeColor) ? '#333' : '#fff';

    document.getElementById('badge-uf').textContent = uf;
    badge.classList.remove('hidden');

    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');

    buildTabs(classes);

    const defaultCls = classes.find(c => c.includes('Soja')) || classes[0];
    selectTab(defaultCls);
  }
})();
