(function () {
  const BIOME_COLORS = {
    'Amazônia':      '#2d6a4f',
    'Cerrado':       '#d4a017',
    'Mata Atlântica':'#40916c',
    'Caatinga':      '#e76f51',
    'Pampa':         '#a8dadc',
  };

  const GOLDEN = new Set(['1201', '5101']);

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

  let activeLayer = null;

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
      fillOpacity: 0.85,
      color: '#fff',
      weight: 2,
    };
  }

  function onEachFeature(feature, layer) {
    const { rgint, nome_rgint, uf, biome } = feature.properties;

    layer.bindTooltip(
      `<strong>${rgint} — ${nome_rgint}</strong><br>${uf} &middot; ${biome}`,
      { sticky: true, opacity: 0.92 }
    );

    layer.on({
      mouseover(e) {
        if (e.target !== activeLayer) e.target.setStyle(highlightStyle(feature));
      },
      mouseout(e) {
        if (e.target !== activeLayer) e.target.setStyle(style(feature));
      },
      click(e) {
        if (activeLayer) activeLayer.setStyle(style(activeLayer.feature));
        activeLayer = e.target;
        activeLayer.setStyle(highlightStyle(feature));
        activeLayer.bringToFront();
        window.loadRegion(rgint, nome_rgint, uf, biome);
      },
    });
  }

  fetch('/api/geojson')
    .then(r => r.json())
    .then(geojson => {
      const geoLayer = L.geoJSON(geojson, { style, onEachFeature }).addTo(map);

      // Star markers for golden-standard regions
      geojson.features.forEach(f => {
        const { rgint, nome_rgint, uf } = f.properties;
        if (!GOLDEN.has(rgint)) return;

        // Centroid approximation from first coordinate ring
        const coords = f.geometry.type === 'Polygon'
          ? f.geometry.coordinates[0]
          : f.geometry.coordinates[0][0];
        const lats = coords.map(c => c[1]);
        const lngs = coords.map(c => c[0]);
        const lat = (Math.min(...lats) + Math.max(...lats)) / 2;
        const lng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

        const icon = L.divIcon({
          className: '',
          html: '<span class="golden-icon" title="Padrão-ouro">★</span>',
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        });
        L.marker([lat, lng], { icon, interactive: false }).addTo(map);
      });

      // Auto-load Cuiabá (5101) on start
      const cuiaba = geojson.features.find(f => f.properties.rgint === '5101');
      if (cuiaba) {
        const { rgint, nome_rgint, uf, biome } = cuiaba.properties;
        window.loadRegion(rgint, nome_rgint, uf, biome);
      }
    })
    .catch(err => console.error('GeoJSON load failed:', err));
})();
