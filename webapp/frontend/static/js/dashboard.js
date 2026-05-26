(function () {
  const CLASS_COLORS = {
    // Culturas anuais — warm spectrum
    '1 - Culturas perenes':          '#E07B00',  // amber
    '2 - Soja':                      '#F5C400',  // gold
    '3 - Soja + Milho 2ª safra':     '#E8502A',  // vermillion
    '4 - Milho 1ª safra':            '#FFA040',  // light orange
    '5 - Cana-de-açúcar':            '#B5D400',  // yellow-green
    // Outras culturas
    '6 - Outra agropecuária':        '#7B5E2A',  // brown
    // Pastagem — pink/rose range, 3 levels of degradation
    '7 - Pastagem deg. média':       '#C2185B',  // hot pink
    '8 - Pastagem deg. alta':        '#7B003E',  // dark maroon
    '9 - Pastagem deg. baixa':       '#F8A8C8',  // light pink
    // Floresta — green range
    '10 - Silvicultura':             '#00BFA5',  // teal-green
    '11 - Veg. prim. florestal':     '#1B5E20',  // deep forest green
    '12 - Veg. sec. florestal':      '#66BB6A',  // medium green
    // Veg. não-florestal — blue range
    '13 - Veg. prim. não-florestal': '#0D47A1',  // dark blue
    '14 - Veg. sec. não-florestal':  '#64B5F6',  // light blue
    // Outro
    '15 - Outro':                    '#9E9E9E',  // neutral grey
  };

  const BIOME_COLORS = {
    'Amazônia':      '#009E73',
    'Cerrado':       '#E69F00',
    'Mata Atlântica':'#0072B2',
    'Caatinga':      '#F0E442',
    'Pampa':         '#CC79A7',
  };

  const SOURCE_META = {
    pipeline_diagonal: { label: 'Pipeline MB/TC',      color: null,      dash: 'solid',   width: 3   },
    conab_pam:         { label: 'PAM / IBGE',           color: '#B71C1C', dash: 'dot',     width: 2   },
    conab_cafe:        { label: 'CONAB Café',            color: '#4527A0', dash: 'dashdot', width: 2   },
    lapig_vigor:       { label: 'LAPIG Vigor',           color: '#00695C', dash: 'dash',    width: 2   },
    mb_pastagem_total: { label: 'MB Pastagem Total',    color: '#0277BD', dash: 'dot',     width: 1.5 },
    mb_floresta_total: { label: 'MB Floresta Total',    color: '#558B2F', dash: 'dot',     width: 1.5 },
    mb_savana_total:   { label: 'MB Savana Total',      color: '#E65100', dash: 'dot',     width: 1.5 },
    tc_pastagem:       { label: 'TC Pastagem',          color: '#AD1457', dash: 'dash',    width: 1.5 },
    tc_floresta_prim:  { label: 'TC Floresta Primária', color: '#006064', dash: 'dash',    width: 1.5 },
    tc_floresta_sec:   { label: 'TC Floresta Sec.',     color: '#827717', dash: 'dashdot', width: 1.5 },
    tc_nao_florestal:  { label: 'TC Não-Florestal',    color: '#4E342E', dash: 'dash',    width: 1.5 },
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

  let currentData      = null;
  let currentFormat    = null;
  let activeClass      = null;
  let currentRgintId   = null;
  let currentNome      = null;
  let activeSourceIndex = null;  // null = no highlight; integer = curveNumber
  let chartEventsBound = false;

  const DIM_OPACITY  = 0.12;
  const FULL_OPACITY = 1.0;

  function _applyTraceHighlight(chartEl, clickedIdx) {
    const n = chartEl.data.length;
    if (clickedIdx === activeSourceIndex) {
      activeSourceIndex = null;
      Plotly.restyle('chart', { opacity: Array(n).fill(FULL_OPACITY) });
    } else {
      activeSourceIndex = clickedIdx;
      const opacities = Array.from({ length: n }, (_, i) =>
        i === clickedIdx ? FULL_OPACITY : DIM_OPACITY
      );
      Plotly.restyle('chart', { opacity: opacities });
    }
  }

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

  function hasOutliers(cls) {
    if (currentFormat !== 'full' || !currentData?.classes?.[cls]) return false;
    return Object.values(currentData.classes[cls]).some(
      src => src.outliers && src.outliers.length > 0
    );
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

    if (hasOutliers(cls)) {
      btn.classList.add('has-outliers');
      const warn = document.createElement('span');
      warn.className = 'outlier-warn';
      warn.textContent = '⚠';
      warn.title = 'Outliers detectados nesta classe';
      btn.appendChild(warn);
    }

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
      const outlierCount = src.outliers ? src.outliers.length : 0;
      const outlierBit = outlierCount > 0
        ? ` <span style="color:#c62828;font-weight:700">⚠${outlierCount}</span>`
        : '';
      return `<span class="source-pill">` +
        `<span class="source-dot" style="background:${dotColor}"></span>` +
        `<span>${meta.label}${badge}${outlierBit}</span>` +
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

    // Reset highlight state when switching class or region
    activeSourceIndex = null;

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

        // Overlay red open-circle markers for outlier years
        if (src.outliers && src.outliers.length > 0) {
          const ox = [], oy = [];
          src.outliers.forEach(yr => {
            const idx = src.years.indexOf(yr);
            if (idx >= 0 && src.values[idx] != null) {
              ox.push(yr);
              oy.push(src.values[idx]);
            }
          });
          if (ox.length > 0) {
            traces.push({
              x: ox,
              y: oy,
              type: 'scatter',
              mode: 'markers',
              marker: { color: '#c62828', size: 14, symbol: 'circle-open', line: { color: '#c62828', width: 2.5 } },
              name: `⚠ ${meta.label}`,
              showlegend: true,
              hovertemplate: `<b>%{x}</b><br>⚠ Outlier detectado<br><i>${meta.label}</i><extra></extra>`,
            });
          }
        }
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

    if (!chartEventsBound) {
      chartEl.on('plotly_legendclick', function (data) {
        _applyTraceHighlight(chartEl, data.curveNumber);
        return false;  // suppress default visibility toggle
      });
      chartEl.on('plotly_click', function (data) {
        if ((!data || !data.points || data.points.length === 0) && activeSourceIndex !== null) {
          activeSourceIndex = null;
          Plotly.restyle('chart', { opacity: Array(chartEl.data.length).fill(FULL_OPACITY) });
        }
      });
      chartEventsBound = true;
    }
  }

  // ── Load region (tries full endpoint first, falls back to simple) ───────

  window.loadRegion = function (rgintId, nome, uf, biome) {
    currentRgintId = rgintId;
    currentNome    = nome;

    const reportLink = document.getElementById('report-link');
    reportLink.href = (window.API_BASE||'') + `/report/${rgintId}`;
    reportLink.classList.remove('hidden');

    // Notify transition view
    if (typeof window.onRegionChanged === 'function') {
      window.onRegionChanged(rgintId);
    }

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
    biomeEl.textContent      = biome;
    biomeEl.style.background = biomeColor + '99';
    biomeEl.style.color      = isLight(biomeColor) ? '#333' : '#fff';

    document.getElementById('badge-uf').textContent = uf;
    badge.classList.remove('hidden');

    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');

    // Switch back to series view on new region
    document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
    const seriesBtn = document.querySelector('.view-btn[data-view="series"]');
    if (seriesBtn) seriesBtn.classList.add('active');
    const seriesView = document.getElementById('series-view');
    if (seriesView) seriesView.classList.remove('hidden');
    const transitionPanel = document.getElementById('transition-panel');
    if (transitionPanel) transitionPanel.classList.add('hidden');

    buildTabs(classes);

    const defaultCls = classes.find(c => c.includes('Soja')) || classes[0];
    selectTab(defaultCls);
  }
})();
