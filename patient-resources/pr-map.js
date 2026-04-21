// Builds a Leaflet map from window.PR_MAP_DATA = { offices, points, pointType, labels }
(function () {
  if (typeof L === 'undefined') return;
  var data = window.PR_MAP_DATA;
  if (!data || !document.getElementById('pr-map')) return;

  var labels = data.labels || {};
  var officeLabel = labels.office || 'Dr. Barrera office';
  var pointLabel = labels.point || 'Therapy location';
  var callLabel = labels.call || 'Call';
  var directionsLabel = labels.directions || 'Directions';

  var map = L.map('pr-map', { scrollWheelZoom: false, zoomControl: true });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    subdomains: 'abcd',
    maxZoom: 19
  }).addTo(map);

  function makeIcon(color, size) {
    size = size || 16;
    var s = size;
    var html = '<span style="display:block;width:' + s + 'px;height:' + s + 'px;border-radius:50%;background:' + color + ';border:3px solid white;box-shadow:0 0 0 1px rgba(0,0,0,0.25), 0 1px 3px rgba(0,0,0,0.3);"></span>';
    return L.divIcon({
      className: 'pr-map-marker',
      html: html,
      iconSize: [s + 6, s + 6],
      iconAnchor: [(s + 6) / 2, (s + 6) / 2]
    });
  }

  var officeIcon = makeIcon('#1B3A5C', 20);
  var pointColor = data.pointType === 'emg' ? '#059669' : '#D97706';
  var pointIcon = makeIcon(pointColor, 14);

  function popupHtml(item, tag) {
    var html = '<div class="pr-map-popup"><strong>' + escapeHtml(item.n) + '</strong>';
    if (item.a) html += '<div>' + escapeHtml(item.a) + '</div>';
    var links = [];
    if (item.p) {
      var tel = item.p.replace(/[^0-9+]/g, '');
      links.push('<a href="tel:' + tel + '">' + callLabel + ': ' + escapeHtml(item.p) + '</a>');
    }
    if (item.a) {
      var q = encodeURIComponent(item.n + ', ' + item.a);
      links.push('<a href="https://www.google.com/maps/search/?api=1&query=' + q + '" target="_blank" rel="noopener">' + directionsLabel + '</a>');
    }
    if (links.length) html += '<div style="margin-top:4px;">' + links.join(' &middot; ') + '</div>';
    html += '</div>';
    return html;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  var bounds = [];

  (data.offices || []).forEach(function (o) {
    var m = L.marker(o.c, { icon: officeIcon, title: officeLabel + ': ' + o.n });
    m.bindPopup(popupHtml(o, 'office'));
    m.addTo(map);
    bounds.push(o.c);
  });

  (data.points || []).forEach(function (p) {
    var m = L.marker(p.c, { icon: pointIcon, title: p.n });
    m.bindPopup(popupHtml(p, 'point'));
    m.addTo(map);
    bounds.push(p.c);
  });

  if (bounds.length) {
    map.fitBounds(bounds, { padding: [30, 30] });
  } else {
    map.setView([40.72, -73.85], 11);
  }
})();
