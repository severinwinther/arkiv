/* Arkiv – monumenter, gravsteiner, skrift og skulpturer.
   Dataene ligger i data/objekter.json. Legg bilder i mappen bilder/ og
   sett "bilde": "bilder/filnavn.jpg" på objektet for å vise ekte foto. */
(function () {
  'use strict';

  var KAT = {
    Monument: { navn: 'Monumenter', ikon: '<path d="M50 8 L58 22 L61 108 L39 108 L42 22 Z"/><rect x="30" y="108" width="40" height="8"/><rect x="22" y="116" width="56" height="8"/>' },
    Gravstein: { navn: 'Gravsteiner', ikon: '<path d="M30 118 V52 A20 20 0 0 1 70 52 V118 Z"/><path d="M42 58 H58 M44 66 H56"/><path d="M14 118 H86"/>' },
    Skrift: { navn: 'Skrift', ikon: '<path d="M26 108 L50 26 L74 108"/><path d="M34 82 H66"/><path d="M18 108 H34 M66 108 H82"/>' },
    Skulptur: { navn: 'Skulpturer', ikon: '<circle cx="50" cy="34" r="14"/><path d="M44 47 V54 M56 47 V54"/><path d="M24 94 C24 66 76 66 76 94 Z"/><rect x="34" y="94" width="32" height="24"/>' }
  };
  var KAT_ORDER = ['Monument', 'Gravstein', 'Skrift', 'Skulptur'];
  var GROUPS = [
    { key: 'materiale', label: 'MATERIALE' },
    { key: 'sted', label: 'STED / OPPHAV' },
    { key: 'vernestatus', label: 'VERNESTATUS' }
  ];
  var MIN = 1100, MAX = 2026, PLAY_SECONDS = 4;

  var data = [];
  var st = {
    tab: 'katalog', kat: null, q: '', mode: 'meta', sort: 'aar', dir: 1, view: 'index',
    from: MIN, to: MAX, sel: { materiale: [], sted: [], vernestatus: [] },
    preview: null, open: null, play: false, playing: true, playIdx: 0, playTick: 0
  };
  try { var v = localStorage.getItem('arkiv-visning'); if (v === 'index' || v === 'gallery') st.view = v; } catch (e) {}

  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var pad = function (n) { return (n < 10 ? '0' : '') + n; };

  function media(r) {
    if (r.bilde) return '<img src="' + esc(r.bilde) + '" alt="' + esc(r.tittel) + '" loading="lazy">';
    return '<svg viewBox="0 0 100 130" aria-hidden="true">' + KAT[r.kategori].ikon + '</svg>';
  }

  function fields(r, full) {
    var sk = { k: 'SKANNET', v: r.skannet ? 'Ja' : 'Nei' };
    var f;
    if (r.kategori === 'Skrift') {
      f = [{ k: 'ÅR', v: r.datering }, { k: 'KLASSIFIKASJON', v: r.materiale }, { k: 'DESIGNER', v: r.skaper }, { k: 'OPPHAV', v: r.sted }, { k: 'SNITT', v: r.maal }, { k: 'BRUK', v: r.inskripsjon }, { k: 'FORMAT', v: r.tilstand }, sk];
    } else {
      f = [{ k: 'DATERING', v: r.datering }, { k: 'MATERIALE', v: r.materiale }, { k: 'MÅL', v: r.maal }, { k: 'STED', v: r.sted }, { k: 'SKAPER', v: r.skaper }, { k: 'INSKRIPSJON', v: r.inskripsjon }, { k: 'TILSTAND', v: r.tilstand }, { k: 'VERNESTATUS', v: r.vernestatus }, sk];
    }
    if (full) f = [{ k: 'KAT.NR', v: r.id }, { k: 'KATEGORI', v: r.kategori }].concat(f);
    return f.map(function (x) { return '<dt>' + x.k + '</dt><dd>' + esc(x.v) + '</dd>'; }).join('');
  }

  /* ---------- filtrering ---------- */
  function base() {
    var q = st.q.trim().toLowerCase();
    return data.filter(function (r) {
      if (st.kat && r.kategori !== st.kat) return false;
      if (r.aar < st.from || r.aar > st.to) return false;
      if (!q) return true;
      var hay = [r.id, r.tittel, r.kategori, r.materiale, r.sted, r.skaper, r.datering];
      if (st.mode === 'text') hay = hay.concat([r.beskrivelse, r.inskripsjon]);
      return hay.join(' ').toLowerCase().indexOf(q) > -1;
    });
  }
  function filtered() {
    var list = base();
    GROUPS.forEach(function (g) {
      var v = st.sel[g.key];
      if (v.length) list = list.filter(function (r) { return v.indexOf(r[g.key]) > -1; });
    });
    var k = st.sort, d = st.dir;
    return list.slice().sort(function (a, b) {
      var x = a[k], y = b[k];
      return (typeof x === 'string' ? x.localeCompare(y, 'nb') : x - y) * d;
    });
  }
  var current = [];
  var openGroups = {};

  /* ---------- tegning ---------- */
  function renderNav() {
    var items = [{ k: null, l: 'KATALOG' }].concat(KAT_ORDER.map(function (k) { return { k: k, l: KAT[k].navn.toUpperCase() }; }));
    var html = items.map(function (n) {
      var a = st.tab === 'katalog' && st.kat === n.k;
      return '<button type="button" class="t" data-kat="' + (n.k || '') + '" aria-pressed="' + a + '">' + n.l + '</button>';
    }).join('');
    html += '<button type="button" class="t" data-tab="om" aria-pressed="' + (st.tab === 'om') + '">OM</button>';
    $('nav').innerHTML = html;
  }

  function renderFilters(b) {
    var bins = [], max = 1;
    for (var c = 1100; c <= 2000; c += 100) {
      var n = data.filter(function (r) { return r.aar >= c && r.aar < c + 100; }).length;
      bins.push({ c: c, n: n }); if (n > max) max = n;
    }
    $('hist').innerHTML = bins.map(function (x) {
      var on = x.c + 99 >= st.from && x.c <= st.to;
      return '<div class="' + (on ? 'on' : '') + '" style="height:' + Math.max(4, Math.round(x.n / max * 100)) + '%" title="' + x.c + '-tallet: ' + x.n + '"></div>';
    }).join('');
    $('fromR').value = st.from; $('toR').value = st.to;
    if (document.activeElement !== $('fromN')) $('fromN').value = st.from;
    if (document.activeElement !== $('toN')) $('toN').value = st.to;

    $('facets').innerHTML = GROUPS.map(function (g) {
      var counts = {};
      data.forEach(function (r) { counts[r[g.key]] = 0; });
      b.forEach(function (r) { counts[r[g.key]]++; });
      var keys = Object.keys(counts).sort(function (x, y) { return counts[y] - counts[x] || x.localeCompare(y, 'nb'); });
      var isOpen = openGroups[g.key] !== undefined ? openGroups[g.key] : window.innerWidth > 640;
      return '<details data-group="' + g.key + '"' + (isOpen ? ' open' : '') + '><summary>' + g.label + '</summary>' + keys.map(function (k) {
        var on = st.sel[g.key].indexOf(k) > -1;
        return '<button type="button" class="facet' + (counts[k] ? '' : ' zero') + '" data-g="' + g.key + '" data-v="' + esc(k) + '" aria-pressed="' + on + '"><span>' + esc(k) + '</span><span>' + counts[k] + '</span></button>';
      }).join('') + '</details>';
    }).join('');

    var any = st.q || st.kat || st.from > MIN || st.to < MAX || GROUPS.some(function (g) { return st.sel[g.key].length; });
    $('reset').hidden = !any;
  }

  function renderTools() {
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.mode === st.mode); });
    document.querySelectorAll('[data-sort]').forEach(function (b) {
      var a = b.dataset.sort === st.sort;
      b.setAttribute('aria-pressed', a);
      b.textContent = b.textContent.replace(/ [↑↓]$/, '') + (a ? (st.dir === 1 ? ' ↑' : ' ↓') : '');
    });
    document.querySelectorAll('[data-view]').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.view === st.view); });
  }

  function renderPreview() {
    var r = current.find(function (x) { return x.id === st.preview; }) || current[0];
    if (!r) { $('preview').innerHTML = ''; return; }
    st.preview = r.id;
    document.querySelectorAll('#indexList button').forEach(function (b) { b.classList.toggle('active', b.dataset.id === r.id); });
    $('preview').innerHTML =
      '<div class="media portrait">' + media(r) + '</div>' +
      '<div class="meta"><span>' + KAT[r.kategori].navn.toUpperCase() + '</span><span class="mono">' + r.id + '</span></div>' +
      '<h3>' + esc(r.tittel) + '</h3><p>' + esc(r.beskrivelse) + '</p>' +
      '<button type="button" class="link-btn" data-open="' + r.id + '">SE DETALJER</button>';
  }

  function renderResults() {
    var empty = current.length === 0;
    $('empty').hidden = !empty;
    $('indexView').hidden = empty || st.view !== 'index';
    $('galleryView').hidden = empty || st.view !== 'gallery';
    $('count').textContent = pad(current.length);
    if (st.view === 'index') {
      $('indexList').innerHTML = current.map(function (r) {
        return '<li><button type="button" class="row" data-id="' + r.id + '" data-open="' + r.id + '">' +
          '<span>' + r.id + '</span><span>' + esc(r.tittel) + '</span><span>' + esc(r.materiale) + '</span><span>' + esc(r.sted) + '</span><span class="r">' + esc(r.datering) + '</span></button></li>';
      }).join('');
      renderPreview();
    } else {
      $('galleryView').innerHTML = current.map(function (r) {
        return '<li><button type="button" data-open="' + r.id + '"><div class="media portrait">' + media(r) + '</div>' +
          '<div class="meta"><span>' + KAT[r.kategori].navn.toUpperCase() + '</span><span class="mono">' + esc(r.datering) + '</span></div>' +
          '<span class="ttl">' + esc(r.tittel) + '</span></button></li>';
      }).join('');
    }
  }

  function render() {
    renderNav();
    $('katalog').hidden = st.tab !== 'katalog';
    $('om').hidden = st.tab !== 'om';
    var b = base();
    current = filtered();
    renderFilters(b);
    renderTools();
    renderResults();
  }

  /* ---------- detaljpanel ---------- */
  var lastFocus = null;
  function openDetail(id, keepFocus) {
    var r = data.find(function (x) { return x.id === id; });
    if (!r) return;
    if (!keepFocus) lastFocus = document.activeElement;
    st.open = id;
    $('dMeta').innerHTML = KAT[r.kategori].navn.toUpperCase() + '&nbsp;&nbsp;<span class="mono">' + r.id + '</span>';
    $('dMedia').innerHTML = media(r);
    $('dTitle').textContent = r.tittel;
    $('dDesc').textContent = r.beskrivelse;
    $('dFields').innerHTML = fields(r, true);
    $('drawer').hidden = false;
    document.body.style.overflow = 'hidden';
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    if (!keepFocus) $('dClose').focus();
  }
  function closeDetail() {
    st.open = null;
    $('drawer').hidden = true;
    document.body.style.overflow = '';
    history.replaceState(null, '', location.pathname + location.search);
    if (lastFocus) lastFocus.focus();
  }
  function stepDetail(d) {
    var list = current.length ? current : data;
    var i = list.findIndex(function (x) { return x.id === st.open; });
    var n = list[(i + d + list.length) % list.length];
    st.preview = n.id;
    openDetail(n.id, true);
  }

  /* ---------- avspilling ---------- */
  function renderPlayer() {
    var r = data[st.playIdx];
    $('pPos').textContent = pad(st.playIdx + 1) + ' / ' + pad(data.length);
    $('pMedia').innerHTML = media(r);
    $('pMeta').innerHTML = KAT[r.kategori].navn.toUpperCase() + '&nbsp;&nbsp;<span class="mono" style="font-weight:400">' + r.id + '</span>';
    $('pTitle').textContent = r.tittel;
    $('pDesc').textContent = r.beskrivelse;
    $('pFields').innerHTML = fields(r, false);
    $('pToggle').textContent = st.playing ? '❚❚ PAUSE' : '▶ SPILL';
    $('pBar').style.width = ((st.playIdx + st.playTick / PLAY_SECONDS) / data.length * 100).toFixed(2) + '%';
  }
  function startPlay() {
    if (!data.length) return;
    if (st.open) closeDetail();
    st.play = true; st.playing = true; st.playIdx = 0; st.playTick = 0;
    $('player').hidden = false; document.body.style.overflow = 'hidden';
    renderPlayer(); $('pToggle').focus();
  }
  function stopPlay() {
    st.play = false; $('player').hidden = true; document.body.style.overflow = '';
    $('playStart').focus();
  }
  function stepPlay(d) { st.playIdx = (st.playIdx + d + data.length) % data.length; st.playTick = 0; renderPlayer(); }

  /* ---------- klokke og takt ---------- */
  function tick() {
    var n = new Date();
    $('clock').textContent = pad(n.getHours()) + ':' + pad(n.getMinutes()) + ':' + pad(n.getSeconds());
    if (st.play && st.playing) {
      st.playTick++;
      if (st.playTick >= PLAY_SECONDS) { st.playTick = 0; st.playIdx = (st.playIdx + 1) % data.length; }
      renderPlayer();
    }
  }

  /* ---------- hendelser ---------- */
  function clampYear(v) { v = parseInt(v, 10); if (isNaN(v)) v = MIN; return Math.min(MAX, Math.max(MIN, v)); }
  function resetAll() {
    st.tab = 'katalog'; st.kat = null; st.q = ''; st.from = MIN; st.to = MAX;
    st.sel = { materiale: [], sted: [], vernestatus: [] }; $('q').value = '';
    render();
  }

  function bind() {
    document.addEventListener('click', function (e) {
      var t = e.target.closest('button'); if (!t) return;
      if (t.dataset.open) { openDetail(t.dataset.open); return; }
      if (t.hasAttribute('data-kat')) { st.tab = 'katalog'; st.kat = t.dataset.kat || null; st.preview = null; render(); return; }
      if (t.dataset.tab === 'om') { st.tab = 'om'; render(); return; }
      if (t.dataset.mode) { st.mode = t.dataset.mode; render(); return; }
      if (t.dataset.sort) { if (st.sort === t.dataset.sort) st.dir = -st.dir; else { st.sort = t.dataset.sort; st.dir = 1; } render(); return; }
      if (t.dataset.view) { st.view = t.dataset.view; try { localStorage.setItem('arkiv-visning', st.view); } catch (err) {} render(); return; }
      if (t.dataset.g) {
        var arr = st.sel[t.dataset.g], i = arr.indexOf(t.dataset.v);
        if (i > -1) arr.splice(i, 1); else arr.push(t.dataset.v);
        render(); return;
      }
    });
    $('indexList').addEventListener('mouseover', function (e) {
      var b = e.target.closest('button[data-id]');
      if (b && b.dataset.id !== st.preview) { st.preview = b.dataset.id; renderPreview(); }
    });
    $('indexList').addEventListener('focusin', function (e) {
      var b = e.target.closest('button[data-id]');
      if (b && b.dataset.id !== st.preview) { st.preview = b.dataset.id; renderPreview(); }
    });
    $('facets').addEventListener('toggle', function (e) {
      if (e.target.dataset && e.target.dataset.group) openGroups[e.target.dataset.group] = e.target.open;
    }, true);
    $('q').addEventListener('input', function (e) { st.q = e.target.value; render(); });
    $('searchForm').addEventListener('submit', function (e) { e.preventDefault(); });
    $('fromR').addEventListener('input', function (e) { st.from = Math.min(clampYear(e.target.value), st.to); render(); });
    $('toR').addEventListener('input', function (e) { st.to = Math.max(clampYear(e.target.value), st.from); render(); });
    $('fromN').addEventListener('change', function (e) { st.from = Math.min(clampYear(e.target.value), st.to); render(); });
    $('toN').addEventListener('change', function (e) { st.to = Math.max(clampYear(e.target.value), st.from); render(); });
    $('reset').addEventListener('click', resetAll);
    $('reset2').addEventListener('click', resetAll);

    $('dClose').addEventListener('click', closeDetail);
    $('drawerScrim').addEventListener('click', closeDetail);
    $('dPrev').addEventListener('click', function () { stepDetail(-1); });
    $('dNext').addEventListener('click', function () { stepDetail(1); });

    $('playStart').addEventListener('click', startPlay);
    $('pClose').addEventListener('click', stopPlay);
    $('pPrev').addEventListener('click', function () { stepPlay(-1); });
    $('pNext').addEventListener('click', function () { stepPlay(1); });
    $('pToggle').addEventListener('click', function () { st.playing = !st.playing; st.playTick = 0; renderPlayer(); });

    $('drawer').addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeDetail();
      if (e.key === 'ArrowLeft') stepDetail(-1);
      if (e.key === 'ArrowRight') stepDetail(1);
    });
    $('player').addEventListener('keydown', function (e) {
      if (e.key === 'Escape') stopPlay();
      if (e.key === 'ArrowLeft') stepPlay(-1);
      if (e.key === 'ArrowRight') stepPlay(1);
    });
    window.addEventListener('hashchange', function () {
      var id = location.hash.slice(1);
      if (id && data.some(function (r) { return r.id === id; })) openDetail(id);
    });
  }

  function init(json) {
    data = json;
    bind();
    render();
    tick(); setInterval(tick, 1000);
    var id = location.hash.slice(1);
    if (id && data.some(function (r) { return r.id === id; })) openDetail(id);
  }

  fetch('data/objekter.json')
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(init)
    .catch(function () {
      document.querySelector('.results').innerHTML = '<p class="empty">Kunne ikke laste data/objekter.json. Åpne siden via en webserver (f.eks. GitHub Pages), ikke direkte fra fil.</p>';
    });
})();
