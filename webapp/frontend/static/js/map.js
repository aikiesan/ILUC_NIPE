(function () {
  // Paleta Okabe-Ito — daltonico-segura, espelhada em dashboard.js
  const BIOME_COLORS = {
    'Amazônia':      '#009E73',
    'Cerrado':       '#E69F00',
    'Mata Atlântica':'#0072B2',
    'Caatinga':      '#F0E442',
    'Pampa':         '#CC79A7',
  };

  function isLight(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  const map = L.map('map', {
    center: [-14, -52],
    zoom: 4,
    zoomControl: true,
  });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19,
  }).addTo(map);

  // Legenda de biomas injetada dinamicamente
  const legendEl = document.getElementById('map-legend');
  if (legendEl) {
    legendEl.innerHTML =
      '<strong class="legend-title">Biomas</strong>' +
      Object.entries(BIOME_COLORS).map(([name, color]) => {
        const border = isLight(color) ? 'border:1px solid #bbb;' : '';
        return `<div class="legend-row">` +
          `<span class="legend-swatch" style="background:${color};${border}"></span>` +
          `<span>${name}</span>` +
          `</div>`;
      }).join('');
  }

  let selectedLayer = null;

  function style(feature) {
    const biome = feature.properties.biome || '';
    return {
      fillColor: BIOME_COLORS[biome] || '#999',
      fillOpacity: 0.55,
      color: '#fff',
      weight: 0.8,
    };
  }

  function highlightStyle(feature) {
    const biome = feature.properties.biome || '';
    return {
      fillColor: BIOME_COLORS[biome] || '#999',
      fillOpacity: 0.80,
      color: '#555',
      weight: 2,
    };
  }

  function selectedStyle(feature) {
    const biome = feature.properties.biome || '';
    return {
      fillColor: BIOME_COLORS[biome] || '#999',
      fillOpacity: 0.85,
      color: '#0072B2',
      weight: 3,
    };
  }

  function onEachFeature(feature, layer) {
    const { rgint, nome_rgint, uf, biome } = feature.properties;

    layer.bindTooltip(
      `<strong>${rgint} — ${nome_rgint}</strong><br>${uf} &middot; ${biome}`,
      { sticky: true, opacity: 0.95 }
    );

    layer.on({
      mouseover(e) {
        if (e.target !== selectedLayer) e.target.setStyle(highlightStyle(feature));
      },
      mouseout(e) {
        if (e.target !== selectedLayer) e.target.setStyle(style(feature));
      },
      click(e) {
        if (selectedLayer) selectedLayer.setStyle(style(selectedLayer.feature));
        selectedLayer = e.target;
        selectedLayer.setStyle(selectedStyle(feature));
        selectedLayer.bringToFront();
        window.loadRegion(rgint, nome_rgint, uf, biome);
      },
    });
  }

  fetch((window.API_BASE||'') + '/api/geojson')
    .then(r => {
      if (!r.ok) throw new Error(`GeoJSON ${r.status}`);
      return r.json();
    })
    .then(geojson => {
      const geoLayer = L.geoJSON(geojson, { style, onEachFeature }).addTo(map);

      // Auto-load Cuiabá (5101) on start with selection highlight
      const cuiaba = geojson.features.find(f => f.properties.rgint === '5101');
      if (cuiaba) {
        const { rgint, nome_rgint, uf, biome } = cuiaba.properties;
        geoLayer.eachLayer(lyr => {
          if (lyr.feature.properties.rgint === rgint) {
            selectedLayer = lyr;
            lyr.setStyle(selectedStyle(cuiaba));
            lyr.bringToFront();
          }
        });
        window.loadRegion(rgint, nome_rgint, uf, biome);
      }
    })
    .catch(err => {
      console.error('GeoJSON load failed:', err);
      const errEl = document.getElementById('map-error');
      if (errEl) errEl.classList.remove('hidden');
    });
})();
