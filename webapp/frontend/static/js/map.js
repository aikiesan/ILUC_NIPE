(function () {
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

  let selectedLayer = null;

  function style() {
    return { fillColor: '#B8C9D9', fillOpacity: 0.5, color: '#fff', weight: 0.6 };
  }

  function highlightStyle() {
    return { fillColor: '#7A9BB5', fillOpacity: 0.75, color: '#555', weight: 1.5 };
  }

  function selectedStyle() {
    return { fillColor: '#4A90D9', fillOpacity: 0.85, color: '#0052A3', weight: 2.5 };
  }

  function onEachFeature(feature, layer) {
    const { rgint, nome_rgint, uf, biome } = feature.properties;

    layer.bindTooltip(
      `<strong>${rgint} — ${nome_rgint}</strong><br>${uf} &middot; ${biome}`,
      { sticky: true, opacity: 0.95 }
    );

    layer.on({
      mouseover(e) {
        if (e.target !== selectedLayer) e.target.setStyle(highlightStyle());
      },
      mouseout(e) {
        if (e.target !== selectedLayer) e.target.setStyle(style());
      },
      click(e) {
        if (selectedLayer) selectedLayer.setStyle(style());
        selectedLayer = e.target;
        selectedLayer.setStyle(selectedStyle());
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
            lyr.setStyle(selectedStyle());
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
