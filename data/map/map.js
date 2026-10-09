(function(){
  'use strict';
  var W = 2000, H = W * 142 / 360;   // equirectangular from -58° to 84° latitude
  var ZOOM_REGIONS = 1.25;           // regions show from 25 % zoom above the minimum
                                     // (minimum zoom = 100 %: the world fills the map height)
  var reduced = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EXAMPLE = [{region:'Cuyo', from:'ARG', to:'ESP'}];

  var S = {
    topo:null, obj:null, feats:[], countries:{}, codes:[],
    owner:new Map(), sel:null, selCountry:null, hov:null, events:[], neighbors:[],
    note:null, k0:1, zoomed:false
  };

  var mapEl = document.getElementById('map');
  var svg = d3.select('#svg');
  var panel = document.getElementById('panel');
  var tip = document.getElementById('tip');
  var q = document.getElementById('q');
  var results = document.getElementById('results');
  var announce = document.getElementById('announce');

  var root = svg.append('g');
  // three copies of the world side by side for endless horizontal panning
  var copies = root.selectAll('g.copy').data([-1, 0, 1]).join('g').attr('class', 'copy')
    .attr('transform', function(n){ return 'translate(' + (n * W) + ',0)'; });
  var gRegions = copies.append('g').attr('class', 'regions');
  var offPath = copies.append('path').attr('class', 'off-lines');
  var regionLines = copies.append('path').attr('class', 'rlines');
  var borderPath = copies.append('path').attr('class', 'borders');
  var path, zoom, regionSel;

  /* ---------- topología mínima (sin dependencias) ---------- */
  var ARCS = [], USERS = [];
  function decodeArcs(topo){
    var sx = topo.transform.scale[0], sy = topo.transform.scale[1];
    var tx = topo.transform.translate[0], ty = topo.transform.translate[1];
    return topo.arcs.map(function(a){
      var x = 0, y = 0;
      return a.map(function(p){ x += p[0]; y += p[1]; return [x * sx + tx, y * sy + ty]; });
    });
  }
  function ringCoords(refs, gid){
    var out = [];
    refs.forEach(function(r, i){
      var idx = r >= 0 ? r : ~r;
      if (USERS[idx].indexOf(gid) < 0) USERS[idx].push(gid);
      var a = r >= 0 ? ARCS[idx] : ARCS[idx].slice().reverse();
      for (var j = i ? 1 : 0; j < a.length; j++) out.push(a[j]);
    });
    return out;
  }
  function buildFeatures(topo, obj){
    ARCS = decodeArcs(topo);
    USERS = ARCS.map(function(){ return []; });
    return obj.geometries.map(function(g, i){
      var coords = g.arcs.map(function(r){ return ringCoords(r, i); });
      return {type:'Feature', id:i, properties:g.properties, geometry:{type:'Polygon', coordinates:coords}};
    });
  }
  function mesh(filter){
    var lines = [];
    for (var i = 0; i < ARCS.length; i++){
      var u = USERS[i];
      if (!u.length) continue;
      var a = u[0], b = u.length > 1 ? u[1] : u[0];
      if (filter(a, b)) lines.push(ARCS[i]);
    }
    return {type:'MultiLineString', coordinates:lines};
  }
  function neighborsOf(){
    var out = S.feats.map(function(){ return []; });
    USERS.forEach(function(u){
      if (u.length > 1 && u[0] !== u[1]){
        if (out[u[0]].indexOf(u[1]) < 0) out[u[0]].push(u[1]);
        if (out[u[1]].indexOf(u[0]) < 0) out[u[1]].push(u[0]);
      }
    });
    return out;
  }

  function norm(s){ return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function esc(s){ return String(s).replace(/[&<>"]/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); }
  function base(id){ return S.feats[id].properties.c; }
  function own(id){ return S.owner.has(id) ? S.owner.get(id) : base(id); }
  function isOn(code){ return !!(S.countries[code] && S.countries[code].on); }
  function active(id){ return isOn(base(id)); }
  function rname(id){ return S.feats[id].properties.n || cname(base(id)); }
  function cname(code){ return (S.countries[code] && S.countries[code].n) || code; }
  function ccolor(code){ return (S.countries[code] && S.countries[code].k) || '#D5DAE0'; }
  function chip(code){ return '<span class="chip" style="background:' + ccolor(code) + '"></span>'; }
  function fmt(n){ return n.toLocaleString('es-AR'); }

  fetch('world-regions.json').then(function(r){
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return r.json();
  }).then(init).catch(function(){
    document.getElementById('loading').innerHTML = '<span>No se pudo cargar el mapa.</span><button class="btn btn-line btn-sm" type="button" onclick="location.reload()">Volver a intentar</button>';
    panel.innerHTML = '<p class="eyebrow">El mapa no está disponible por ahora.</p>';
  });

  function init(topo){
    S.topo = topo;
    S.obj = topo.objects.regions;
    S.countries = topo.countries;
    S.feats = buildFeatures(topo, S.obj);
    S.neighbors = neighborsOf();
    S.codes = Object.keys(S.countries).filter(isOn).sort(function(a, b){ return cname(a).localeCompare(cname(b), 'es'); });

    var frame = {type:'Polygon', coordinates:[[[-180,-58],[180,-58],[180,84],[-180,84],[-180,-58]]]};
    var proj = d3.geoIdentity().reflectY(true).fitSize([W, H], frame);
    path = d3.geoPath(proj);

    regionSel = gRegions.selectAll('path').data(S.feats).join('path')
      .attr('d', path)
      .classed('off', function(d){ return !active(d.id); });
    offPath.attr('d', path(mesh(function(a, b){ return !active(a) && !active(b) && (a === b || base(a) !== base(b)); })));

    applyExample();
    paintAll();
    setupZoom();
    setupPointer();
    setupSearch();

    document.getElementById('occ').addEventListener('change', function(e){
      mapEl.classList.toggle('focus-occ', e.target.checked);
    });
    document.getElementById('reset').addEventListener('click', function(){
      S.owner.clear(); S.events = [];
      applyExample(); paintAll();
      if (S.sel != null) renderRegion(S.sel); else if (S.selCountry) renderCountry(S.selCountry);
      say('El mapa volvió al estado inicial.');
    });

    q.disabled = false;
    document.getElementById('loading').hidden = true;
    var start = findRegion('Cuyo', 'ARG');
    if (start != null) selectRegion(start, false); else renderEmpty();
  }

  function findRegion(name, code){
    for (var i = 0; i < S.feats.length; i++){
      var p = S.feats[i].properties;
      if (p.n === name && p.c === code) return i;
    }
    return null;
  }

  function applyExample(){
    EXAMPLE.forEach(function(ex){
      var id = findRegion(ex.region, ex.from);
      if (id == null) return;
      S.owner.set(id, ex.to);
      S.events.unshift({id:id, from:ex.from, to:ex.to, example:true, at:null});
    });
  }

  /* ---------- pintura ---------- */
  function paintAll(){
    regionSel.each(function(d){ paintNode(this, d.id); });
    drawBorders();
    highlight();
    renderCounts();
    renderFeed();
  }
  function paintNode(node, id){
    if (!active(id)) return;
    var c = ccolor(own(id));
    node.setAttribute('fill', c);
    node.setAttribute('stroke', c);
    node.classList.toggle('occ', own(id) !== base(id));
  }
  function paintOne(id){
    regionSel.filter(function(d){ return d.id === id; }).each(function(d){ paintNode(this, d.id); });
    drawBorders();
    highlight();
    renderCounts();
    renderFeed();
  }
  function drawBorders(){
    // outline of each participating country, including the coast
    borderPath.attr('d', path(mesh(function(a, b){
      if (!active(a) && !active(b)) return false;
      return a === b || own(a) !== own(b);
    })));
    // borders between regions of the same owner
    regionLines.attr('d', path(mesh(function(a, b){
      return a !== b && active(a) && active(b) && own(a) === own(b);
    })));
  }
  function highlight(){
    regionSel.classed('sel', function(d){
      if (!active(d.id)) return false;
      return S.sel === d.id || (S.selCountry != null && own(d.id) === S.selCountry);
    }).classed('hov', function(d){
      if (!active(d.id) || S.hov == null) return false;
      return S.hov.type === 'r' ? S.hov.id === d.id : own(d.id) === S.hov.code;
    });
  }

  /* ---------- zoom ---------- */
  // minimum zoom (100 %): the world fills exactly the map height
  function fitScale(){ return mapEl.clientHeight / H; }
  // moves the view to the central copy without changing what is shown
  function wrapX(t){
    var n = Math.floor(((mapEl.clientWidth / 2 - t.x) / t.k) / W);
    return t.x + n * W * t.k;
  }
  function normalizeView(){
    var t = d3.zoomTransform(svg.node()), x = wrapX(t);
    if (x !== t.x) svg.call(zoom.transform, d3.zoomIdentity.translate(x, t.y).scale(t.k));
  }
  // Initial view: the Americas and western Europe, where today's participating countries are.
  var HOME = {type:'Polygon', coordinates:[[[-128,-56],[32,-56],[32,72],[-128,72],[-128,-56]]]};
  function activeBounds(){ return path.bounds(HOME); }
  function homeTransform(){
    var w = mapEl.clientWidth, h = mapEl.clientHeight;
    var b = activeBounds();
    var dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1];
    var k = Math.max(fitScale(), 0.94 / Math.max(dx / w, dy / h));
    var cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    return d3.zoomIdentity.translate(w / 2, h / 2).scale(k).translate(-cx, -cy);
  }
  function setZoomed(k){
    var z = k >= fitScale() * ZOOM_REGIONS - 1e-6;
    if (z === S.zoomed) return;
    S.zoomed = z;
    mapEl.classList.toggle('zoomed', z);
    S.hov = null;
    highlight();
  }
  function setupZoom(){
    zoom = d3.zoom()
      .scaleExtent([fitScale(), fitScale() * 60])
      .translateExtent([[-1e7, 0], [1e7, H]])
      .on('zoom', function(e){
        var t = e.transform;
        root.attr('transform', 'translate(' + wrapX(t) + ',' + t.y + ') scale(' + t.k + ')');
        hideTip(); setZoomed(t.k);
      });
    svg.call(zoom).on('dblclick.zoom', null);
    var home = homeTransform();
    S.k0 = home.k;
    svg.call(zoom.transform, home);
    var dur = reduced ? 0 : 350;
    document.getElementById('zin').onclick = function(){ svg.transition().duration(dur).call(zoom.scaleBy, 1.6); };
    document.getElementById('zout').onclick = function(){ svg.transition().duration(dur).call(zoom.scaleBy, 1 / 1.6); };
    document.getElementById('zall').onclick = function(){ normalizeView(); svg.transition().duration(reduced ? 0 : 600).call(zoom.transform, homeTransform()); };
    var t;
    function onResize(){
      clearTimeout(t);
      t = setTimeout(function(){
        var cur = d3.zoomTransform(svg.node());
        var home = homeTransform();
        var rel = cur.k / S.k0;
        S.k0 = home.k;
        zoom.scaleExtent([fitScale(), fitScale() * 60]);
        svg.call(zoom.transform, rel <= 1.001 ? home : cur);
        setZoomed(d3.zoomTransform(svg.node()).k);
      }, 150);
    }
    window.addEventListener('resize', onResize);
    if (window.ResizeObserver) new ResizeObserver(onResize).observe(mapEl);
  }
  // Framing aware of the antimeridian: Alaska and its islands do not stretch the United States frame.
  function viewBounds(geo){
    var feats = geo.type === 'FeatureCollection' ? geo.features : [geo];
    var iv = [], la0 = Infinity, la1 = -Infinity;
    feats.forEach(function(f){
      f.geometry.coordinates.forEach(function(ring){
        var a = Infinity, b = -Infinity;
        ring.forEach(function(p){
          if (p[0] < a) a = p[0];
          if (p[0] > b) b = p[0];
          if (p[1] < la0) la0 = p[1];
          if (p[1] > la1) la1 = p[1];
        });
        iv.push([a, b]);
      });
    });
    iv.sort(function(p, q){ return p[0] - q[0]; });
    var m = [];
    iv.forEach(function(r){
      if (m.length && r[0] <= m[m.length - 1][1]) m[m.length - 1][1] = Math.max(m[m.length - 1][1], r[1]);
      else m.push([r[0], r[1]]);
    });
    var lo = m[0][0], hi = m[m.length - 1][1], best = m[0][0] + 360 - hi;
    for (var i = 0; i < m.length - 1; i++){
      var gap = m[i + 1][0] - m[i][1];
      if (gap > best){ best = gap; lo = m[i + 1][0]; hi = m[i][1] + 360; }
    }
    function x(lon){ return (lon + 180) * W / 360; }
    function y(lat){ return (84 - lat) * H / 142; }
    return [[x(lo), y(la1)], [x(hi), y(la0)]];
  }
  function zoomTo(geo, minRel){
    normalizeView();
    var b = viewBounds(geo);
    var w = mapEl.clientWidth, h = mapEl.clientHeight;
    var dx = Math.max(b[1][0] - b[0][0], 1), dy = Math.max(b[1][1] - b[0][1], 1);
    var k = Math.min(fitScale() * 40, 0.7 / Math.max(dx / w, dy / h));
    k = Math.max(k, fitScale() * (minRel || 1));
    var cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
    svg.transition().duration(reduced ? 0 : 750)
      .call(zoom.transform, d3.zoomIdentity.translate(w / 2, h / 2).scale(k).translate(-cx, -cy));
  }
  function countryGeo(code){
    return {type:'FeatureCollection', features:S.feats.filter(function(f){ return active(f.id) && own(f.id) === code; })};
  }

  /* ---------- puntero ---------- */
  function setupPointer(){
    gRegions.on('pointermove', function(e){
      var d = e.target.__data__;
      if (!d || !active(d.id)) return;
      var o = own(d.id), b = base(d.id), html;
      if (S.zoomed){
        S.hov = {type:'r', id:d.id};
        html = '<b>' + esc(rname(d.id)) + '</b><br><span>' +
          (o === b ? esc(cname(b)) : 'Ocupada por ' + esc(cname(o)) + ' · de ' + esc(cname(b))) + '</span>';
      } else {
        S.hov = {type:'c', code:o};
        html = '<b>' + esc(cname(o)) + '</b><br><span>Acerca el mapa para ver sus regiones</span>';
      }
      highlight();
      tip.innerHTML = html;
      var r = mapEl.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      tip.hidden = false;
      var tw = tip.offsetWidth, th = tip.offsetHeight;
      tip.style.left = Math.min(x, r.width - tw - 16) + 'px';
      tip.style.top = Math.min(y, r.height - th - 16) + 'px';
    }).on('pointerleave', function(){ S.hov = null; highlight(); hideTip(); })
      .on('click', function(e){
        var d = e.target.__data__;
        if (!d || !active(d.id)) return;
        if (S.zoomed) selectRegion(d.id, false); else selectCountry(own(d.id), false);
      });
  }
  function hideTip(){ tip.hidden = true; }

  /* ---------- selección y panel ---------- */
  function selectRegion(id, zoomIn){
    S.sel = id; S.selCountry = null; S.note = null;
    highlight();
    renderRegion(id);
    if (zoomIn) zoomTo(S.feats[id], ZOOM_REGIONS * 1.2);
  }
  function selectCountry(code, zoomIn){
    S.sel = null; S.selCountry = code; S.note = null;
    highlight();
    renderCountry(code);
    if (zoomIn) zoomTo(countryGeo(code), ZOOM_REGIONS * 1.05);
  }

  function suggestedConqueror(id){
    var o = own(id), tally = {};
    (S.neighbors[id] || []).forEach(function(n){
      if (!active(n)) return;
      var c = own(n);
      if (c !== o) tally[c] = (tally[c] || 0) + 1;
    });
    var best = null, bestN = 0;
    Object.keys(tally).forEach(function(c){ if (tally[c] > bestN){ best = c; bestN = tally[c]; } });
    if (best) return best;
    return o === 'ESP' ? 'ARG' : 'ESP';
  }

  function renderEmpty(){
    panel.innerHTML = '<p class="eyebrow">Nada elegido</p><h2>Elige un país</h2>' +
      '<p class="hint">Toca un país del mapa o búscalo por nombre. Acerca el mapa para elegir una de sus regiones.</p>';
  }

  function renderRegion(id){
    var f = S.feats[id], name = rname(id), b = base(id), o = own(id), occ = o !== b;
    var provs = f.properties.p || [];
    var pick = suggestedConqueror(id);
    var opts = S.codes.map(function(c){
      return '<option value="' + c + '"' + (c === pick ? ' selected' : '') + '>' + esc(cname(c)) + '</option>';
    }).join('');
    panel.innerHTML =
      '<div><p class="eyebrow">Región de ' + esc(cname(b)) + '</p><h2>' + esc(name) + '</h2></div>' +
      '<dl class="facts"><dt>Controlada por</dt><dd>' + chip(o) + esc(cname(o)) + '</dd>' +
      '<dt>País de origen</dt><dd>' + chip(b) + esc(cname(b)) + '</dd>' +
      (provs.length ? '<dt>Incluye</dt><dd style="font-weight:400">' + esc(provs.join(', ')) + '</dd>' : '') + '</dl>' +
      (occ ? '<p class="status occ">Ocupada. ' + esc(cname(o)) + ' se la quitó a ' + esc(cname(b)) + '.</p>'
           : '<p class="status">Bajo control de ' + esc(cname(b)) + '.</p>') +
      (S.note ? '<p class="done" role="status">' + esc(S.note) + '</p>' : '') +
      '<div class="act"><label for="conq">Conquistar con</label>' +
      '<div class="pick"><span class="chip" id="conq-chip" style="background:' + ccolor(pick) + '"></span><select id="conq">' + opts + '</select></div>' +
      '<button class="btn btn-war" type="button" id="do-conq">Conquistar ' + esc(name) + '</button>' +
      '<p class="hint" id="conq-hint">' + esc(name) + ' pasará al color de ' + esc(cname(pick)) + '.</p>' +
      (occ ? '<button class="btn btn-line" type="button" id="do-free">Devolver a ' + esc(cname(b)) + '</button>' : '') +
      '</div>' +
      '<div class="row"><button class="link" type="button" id="go-region">Ver en el mapa</button>' +
      '<button class="link" type="button" id="go-country">Ver ' + esc(cname(o)) + '</button></div>';

    var sel = document.getElementById('conq'), btn = document.getElementById('do-conq');
    function sync(){
      var c = sel.value;
      document.getElementById('conq-chip').style.background = ccolor(c);
      var same = c === own(id);
      btn.disabled = same;
      document.getElementById('conq-hint').textContent = same
        ? cname(c) + ' ya controla ' + name + '. Elige otro país.'
        : name + ' pasará al color de ' + cname(c) + '.';
    }
    sel.addEventListener('change', sync);
    sync();
    btn.addEventListener('click', function(){ conquer(id, sel.value); });
    var free = document.getElementById('do-free');
    if (free) free.addEventListener('click', function(){ liberate(id); });
    document.getElementById('go-region').addEventListener('click', function(){ zoomTo(S.feats[id], ZOOM_REGIONS * 1.2); });
    document.getElementById('go-country').addEventListener('click', function(){ selectCountry(own(id), true); });
  }

  function renderCountry(code){
    var mine = [], lost = [], won = [];
    for (var i = 0; i < S.feats.length; i++){
      if (!active(i)) continue;
      var b = base(i), o = own(i);
      if (o === code) mine.push(i);
      if (b === code && o !== code) lost.push(i);
      if (o === code && b !== code) won.push(i);
    }
    var homeTotal = S.feats.filter(function(f){ return base(f.id) === code; }).length;
    function items(ids, show){
      return '<ul class="list">' + ids.map(function(i){
        var who = show(i);
        return '<li>' + chip(who) + '<button type="button" data-id="' + i + '">' + esc(rname(i)) + '</button>' +
          (who !== code ? '<span class="muted">· ' + esc(cname(who)) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }
    panel.innerHTML =
      '<div><p class="eyebrow">País</p><h2>' + esc(cname(code)) + '</h2></div>' +
      '<dl class="facts n"><dt>Controla</dt><dd>' + fmt(mine.length) + (mine.length === 1 ? ' región' : ' regiones') + '</dd>' +
      '<dt>Propias</dt><dd>' + fmt(homeTotal - lost.length) + ' de ' + fmt(homeTotal) + '</dd></dl>' +
      (lost.length ? '<p class="status occ">' + fmt(lost.length) + (lost.length === 1 ? ' región ocupada' : ' regiones ocupadas') + ' por otros países.</p>' : '<p class="status">Controla todo su territorio.</p>') +
      '<div><h3 style="font-size:18px">Regiones</h3>' + items(mine, function(i){ return own(i) === code && base(i) !== code ? base(i) : code; }) + '</div>' +
      (lost.length ? '<div><h3 style="font-size:18px">Ocupadas por otros</h3>' + items(lost, own) + '</div>' : '') +
      '<p class="hint">Elige una región de la lista, o acerca el mapa y tócala, para conquistarla.</p>';
    panel.querySelectorAll('button[data-id]').forEach(function(b){
      b.addEventListener('click', function(){ selectRegion(+b.dataset.id, true); });
    });
  }

  function conquer(id, code){
    var prev = own(id);
    if (prev === code) return;
    if (code === base(id)) S.owner.delete(id); else S.owner.set(id, code);
    S.events.unshift({id:id, from:prev, to:code, at:new Date()});
    paintOne(id);
    var name = rname(id);
    S.note = name + ' ahora es de ' + cname(code) + '.';
    renderRegion(id);
    say(cname(code) + ' conquistó ' + name + '.');
  }
  function liberate(id){
    var prev = own(id), b = base(id);
    S.owner.delete(id);
    S.events.unshift({id:id, from:prev, to:b, at:new Date(), back:true});
    paintOne(id);
    var name = rname(id);
    S.note = name + ' volvió a ' + cname(b) + '.';
    renderRegion(id);
    say(S.note);
  }
  function say(t){ announce.textContent = ''; setTimeout(function(){ announce.textContent = t; }, 30); }

  /* ---------- contadores y bitácora ---------- */
  function renderCounts(){
    var occ = 0, regs = 0;
    S.owner.forEach(function(v, k){ if (v !== base(k)) occ++; });
    S.feats.forEach(function(f){ if (active(f.id)) regs++; });
    document.getElementById('counts').innerHTML =
      '<span><b>' + fmt(S.codes.length) + '</b> países participan</span>' +
      '<span><b>' + fmt(regs) + '</b> regiones</span>' +
      '<span><b>' + fmt(occ) + '</b> ' + (occ === 1 ? 'ocupada' : 'ocupadas') + '</span>';
  }
  function when(ev){
    if (ev.example) return '<span class="tag">Ejemplo</span>';
    var s = Math.round((Date.now() - ev.at) / 1000);
    if (s < 60) return 'Hace un momento';
    return 'Hace ' + Math.round(s / 60) + ' min';
  }
  function renderFeed(){
    var feed = document.getElementById('feed');
    if (!S.events.length){
      feed.innerHTML = '<li><span class="when">—</span><span class="what muted">Sin conquistas. Elige una región en el mapa para empezar.</span><span></span></li>';
      return;
    }
    feed.innerHTML = S.events.slice(0, 8).map(function(ev, i){
      var name = esc(rname(ev.id));
      var what = ev.back
        ? chip(ev.to) + '<span>' + name + ' volvió a <b>' + esc(cname(ev.to)) + '</b></span>'
        : chip(ev.to) + '<span><b>' + esc(cname(ev.to)) + '</b> conquistó ' + name + '</span><span class="muted">· antes de ' + esc(cname(ev.from)) + '</span>';
      return '<li><span class="when">' + when(ev) + '</span><span class="what">' + what + '</span>' +
        '<button class="link" type="button" data-ev="' + i + '">Ver</button></li>';
    }).join('');
    feed.querySelectorAll('button[data-ev]').forEach(function(b){
      b.addEventListener('click', function(){
        selectRegion(S.events[+b.dataset.ev].id, true);
        document.getElementById('mapa').scrollIntoView({behavior: reduced ? 'auto' : 'smooth'});
      });
    });
  }
  setInterval(function(){ if (S.events.some(function(e){ return !e.example; })) renderFeed(); }, 30000);

  /* ---------- búsqueda ---------- */
  function setupSearch(){
    var index = [];
    S.feats.forEach(function(f){
      if (!active(f.id)) return;
      index.push({type:'r', id:f.id, label:rname(f.id), sub:cname(base(f.id)), key:norm(rname(f.id))});
      (f.properties.p || []).forEach(function(pv){
        if (norm(pv) === norm(rname(f.id))) return;
        index.push({type:'p', id:f.id, label:pv, sub:rname(f.id) + ' · ' + cname(base(f.id)), key:norm(pv)});
      });
    });
    var cIndex = S.codes.map(function(c){ return {type:'c', code:c, label:cname(c), key:norm(cname(c))}; });
    var items = [], activeIdx = -1;
    var KIND = {c:'País', r:'Región', p:'Provincia'};

    function close(){ results.hidden = true; q.setAttribute('aria-expanded', 'false'); q.removeAttribute('aria-activedescendant'); activeIdx = -1; }
    function show(){
      var t = norm(q.value.trim());
      if (t.length < 2){ close(); return; }
      var starts = function(e){ return e.key.indexOf(t) === 0; };
      var has = function(e){ return e.key.indexOf(t) > 0; };
      var cs = cIndex.filter(starts).concat(cIndex.filter(has)).slice(0, 3);
      var rs = index.filter(starts).concat(index.filter(has)).slice(0, 8 - cs.length);
      items = cs.concat(rs);
      if (!items.length){
        results.innerHTML = '<li aria-disabled="true" class="muted">Sin resultados para “' + esc(q.value.trim()) + '” entre los países que participan</li>';
      } else {
        results.innerHTML = items.map(function(it, i){
          var code = it.type === 'c' ? it.code : own(it.id);
          return '<li role="option" id="opt' + i + '" data-i="' + i + '" aria-selected="false">' + chip(code) +
            '<span>' + esc(it.label) + (it.sub ? ' <span class="muted">· ' + esc(it.sub) + '</span>' : '') + '</span>' +
            '<span class="kind">' + KIND[it.type] + '</span></li>';
        }).join('');
      }
      results.hidden = false;
      q.setAttribute('aria-expanded', 'true');
      activeIdx = -1;
    }
    function mark(){
      results.querySelectorAll('li[role="option"]').forEach(function(li, i){ li.setAttribute('aria-selected', i === activeIdx ? 'true' : 'false'); });
      if (activeIdx >= 0){ q.setAttribute('aria-activedescendant', 'opt' + activeIdx); var li = document.getElementById('opt' + activeIdx); if (li) li.scrollIntoView({block:'nearest'}); }
    }
    function choose(i){
      var it = items[i];
      if (!it) return;
      q.value = it.label;
      close();
      if (it.type === 'c') selectCountry(it.code, true); else selectRegion(it.id, true);
    }
    q.addEventListener('input', show);
    q.addEventListener('keydown', function(e){
      if (results.hidden && e.key === 'ArrowDown'){ show(); return; }
      if (e.key === 'ArrowDown'){ e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); mark(); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0); mark(); }
      else if (e.key === 'Enter'){ e.preventDefault(); choose(activeIdx >= 0 ? activeIdx : 0); }
      else if (e.key === 'Escape'){ close(); }
    });
    results.addEventListener('mousedown', function(e){
      var li = e.target.closest('li[data-i]');
      if (li){ e.preventDefault(); choose(+li.dataset.i); }
    });
    q.addEventListener('blur', function(){ setTimeout(close, 120); });
  }
})();
