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

  let currentData = null;
  let activeClass = null;

  function buildTabs(classes) {
    const bar = document.getElementById('class-tabs');
    bar.innerHTML = '';
    classes.forEach(cls => {
      const btn = document.createElement('button');
      btn.className = 'tab-btn';
      btn.textContent = cls;
      btn.dataset.cls = cls;
      const color = CLASS_COLORS[cls] || '#666';
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

  function isLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  function plotTimeSeries(cls) {
    if (!currentData || !currentData[cls]) return;
    const series = currentData[cls];
    const years = Object.keys(series).map(Number).sort((a, b) => a - b);
    const areas = years.map(y => series[y]);
    const color = CLASS_COLORS[cls] || '#555';

    const trace = {
      x: years,
      y: areas,
      type: 'scatter',
      mode: 'lines+markers',
      line: { color, width: 2.5 },
      marker: { color, size: 6 },
      name: cls,
      hovertemplate: '<b>%{x}</b><br>%{y:,.1f} ha<extra></extra>',
    };

    const chartEl = document.getElementById('chart');
    const chartH = Math.max(chartEl.clientHeight || 0, 320);

    const layout = {
      title: { text: cls, font: { size: 14 }, x: 0.02 },
      height: chartH,
      autosize: true,
      xaxis: {
        title: 'Ano',
        tickmode: 'linear',
        dtick: 1,
        tickfont: { size: 11 },
      },
      yaxis: {
        title: 'Área (ha)',
        tickfont: { size: 11 },
        tickformat: ',.0f',
      },
      margin: { t: 44, r: 20, b: 52, l: 80 },
      paper_bgcolor: '#fafaf8',
      plot_bgcolor: '#fafaf8',
      hovermode: 'x unified',
      showlegend: false,
    };

    const config = { responsive: true, displayModeBar: false };

    Plotly.react('chart', [trace], layout, config);
  }

  window.loadRegion = function (rgintId, nome, uf, biome) {
    fetch(`/api/rgint/${rgintId}`)
      .then(r => {
        if (!r.ok) throw new Error(`RGINT ${rgintId} not found`);
        return r.json();
      })
      .then(data => {
        currentData = data;

        // Update header badge
        const badge = document.getElementById('region-badge');
        document.getElementById('badge-name').textContent = `${rgintId} — ${nome}`;
        document.getElementById('badge-biome').textContent = biome;
        document.getElementById('badge-biome').style.background =
          (BIOME_COLORS[biome] || '#555') + '99';
        document.getElementById('badge-uf').textContent = uf;
        badge.classList.remove('hidden');

        // Show dashboard, hide welcome
        document.getElementById('welcome').classList.add('hidden');
        document.getElementById('dashboard-content').classList.remove('hidden');

        const classes = Object.keys(data);
        buildTabs(classes);

        // Default to Soja if available, else first class
        const defaultCls = classes.find(c => c.includes('Soja')) || classes[0];
        selectTab(defaultCls);
      })
      .catch(err => console.error('loadRegion error:', err));
  };
})();
