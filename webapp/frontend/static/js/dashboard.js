(function () {
  const CLASS_COLORS = {
    '1 - Culturas perenes':          '#f4a261',
    '2 - Soja':                      '#e9c46a',
    '3 - Soja + Milho 2ª safra':     '#f3722c',
    '4 - Milho 1ª safra':            '#90be6d',
    '5 - Cana-de-açúcar':            '#43aa8b',
    '6 - Outra agropecuária':        '#577590',
    '7 - Pastagem deg. média':       '#c77dff',
    '8 - Pastagem deg. alta':        '#9d4edd',
    '9 - Pastagem deg. baixa':       '#e0aaff',
    '10 - Silvicultura':             '#606c38',
    '11 - Veg. prim. florestal':     '#1b4332',
    '12 - Veg. sec. florestal':      '#52b788',
    '13 - Veg. prim. não-florestal': '#b7e4c7',
    '14 - Veg. sec. não-florestal':  '#74c69d',
    '15 - Outro':                    '#adb5bd',
  };

  const BIOME_COLORS = {
    'Amazônia':      '#2d6a4f',
    'Cerrado':       '#d4a017',
    'Mata Atlântica':'#40916c',
    'Caatinga':      '#e76f51',
    'Pampa':         '#a8dadc',
  };

  // Visual style per data source
  const SOURCE_STYLES = {
    pipeline_diagonal: { dash: 'solid',   width: 2.5, opacity: 1.0   },
    conab_pam:         { dash: 'dot',     width: 2.0, opacity: 0.80  },
    lapig_vigor:       { dash: 'dashdot', width: 2.0, opacity: 0.80  },
  };

  let currentData     = null;   // raw API response
  let currentFormat   = null;   // 'full' | 'simple'
  let activeClass     = null;
  let currentRgintId  = null;

  // ── Colour helpers ──────────────────────────────────────────────────────

  function hexToRgba(hex, alpha) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  function isLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  // ── Tab bar ─────────────────────────────────────────────────────────────

  function buildTabs(classes) {
    const bar = document.getElementById('class-tabs');
    bar.innerHTML = '';
    classes.forEach(cls => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.textContent = cls;
      btn.dataset.cls = cls;
      btn.addEventListener('click', () => selectTab(cls));
      bar.appendChild(btn);
    });
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
      } else {
        b.style.background = '';
        b.style.color = '';
      }
    });
    plotTimeSeries(cls);
  }

  // ── Plotting ────────────────────────────────────────────────────────────

  function plotTimeSeries(cls) {
    if (!currentData) return;

    const chartEl = document.getElementById('chart');
    const chartH  = Math.max(chartEl.clientHeight || 0, 320);
    const baseColor = CLASS_COLORS[cls] || '#555';

    let traces = [];
    let isMultiSource = false;

    if (currentFormat === 'full') {
      // ── Multi-source format ────────────────────────────────────────────
      const classData = currentData.classes?.[cls];
      if (!classData) return;

      const sourceNames = Object.keys(classData);
      isMultiSource = sourceNames.length > 1;

      sourceNames.forEach((srcName, si) => {
        const src   = classData[srcName];
        const style = SOURCE_STYLES[srcName] || { dash: 'solid', width: 2, opacity: 0.8 };

        // Slightly shift hue per source for readability
        const opacity = style.opacity - si * 0.1;
        const lineColor = hexToRgba(baseColor, Math.max(0.4, opacity));

        traces.push({
          x: src.years,
          y: src.values,
          type: 'scatter',
          mode: 'lines+markers',
          name: `${srcName}${src.quality === 'primary' ? ' ★' : ''}`,
          line:   { color: lineColor, dash: style.dash, width: style.width },
          marker: { color: lineColor, size: 5 },
          hovertemplate: `<b>%{x}</b><br>%{y:,.1f} ha<br><i>${srcName}</i><extra></extra>`,
        });

        // Outlier markers
        if (src.outliers && src.outliers.length) {
          const outYears = src.outliers;
          const yearIdx  = src.years.reduce((m, y, i) => { m[y] = i; return m; }, {});
          const outVals  = outYears.map(y => src.values[yearIdx[y]] ?? null);
          traces.push({
            x: outYears,
            y: outVals,
            type: 'scatter',
            mode: 'markers',
            name: `outlier (${srcName})`,
            showlegend: false,
            marker: { color: '#e53935', size: 11, symbol: 'x', line: { color: '#e53935', width: 2 } },
            hovertemplate: `<b>%{x}</b> — outlier (${srcName})<extra></extra>`,
          });
        }
      });

    } else {
      // ── Simple / legacy format ({"2008": 123, ...}) ───────────────────
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
      title: { text: cls, font: { size: 13 }, x: 0.02 },
      height: chartH,
      autosize: true,
      xaxis: { title: 'Ano', tickmode: 'linear', dtick: 1, tickfont: { size: 10 } },
      yaxis: { title: 'Área (ha)', tickfont: { size: 10 }, tickformat: ',.0f' },
      margin: { t: 40, r: 16, b: isMultiSource ? 72 : 52, l: 80 },
      paper_bgcolor: '#fafaf8',
      plot_bgcolor:  '#fafaf8',
      hovermode: 'x unified',
      showlegend: isMultiSource,
      legend: isMultiSource ? { orientation: 'h', y: -0.22, font: { size: 10 } } : {},
    };

    Plotly.react('chart', traces, layout, { responsive: true, displayModeBar: false });
  }

  // ── Load region (tries full endpoint first, falls back to simple) ───────

  window.loadRegion = function (rgintId, nome, uf, biome) {
    currentRgintId = rgintId;

    // Update report link immediately (may 404 until pipeline runs)
    const reportLink = document.getElementById('report-link');
    reportLink.href = `/report/${rgintId}`;
    reportLink.classList.remove('hidden');

    fetch(`/api/rgint_full/${rgintId}`)
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
        // Fallback to original simple diagonal JSON
        fetch(`/api/rgint/${rgintId}`)
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
    // Header badge
    const badge = document.getElementById('region-badge');
    document.getElementById('badge-name').textContent = `${rgintId} — ${nome}`;
    document.getElementById('badge-biome').textContent = biome;
    document.getElementById('badge-biome').style.background = (BIOME_COLORS[biome] || '#555') + '99';
    document.getElementById('badge-uf').textContent = uf;
    badge.classList.remove('hidden');

    // Show dashboard
    document.getElementById('welcome').classList.add('hidden');
    document.getElementById('dashboard-content').classList.remove('hidden');

    buildTabs(classes);

    const defaultCls = classes.find(c => c.includes('Soja')) || classes[0];
    selectTab(defaultCls);
  }
})();
