/* =====================================================================
   CHIC NAILS — comportements
   1) Fonctions statiques (carte, réservation, horaires, menu) : sans GSAP
   2) Mouvement (GSAP + ScrollTrigger + Lenis) : désactivé si
      prefers-reduced-motion ou si les bibliothèques ne se chargent pas.
   ===================================================================== */
(function () {
  'use strict';

  const D = window.CHIC || {};
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);

  let lenis = null;
  let motionReady = false;       // le loader est passé, le scroll est libre
  let menuOpen = false;

  /* ------------------------------------------------------------------
     FORMATS
  ------------------------------------------------------------------- */
  const euro = (n) => (typeof n === 'number' ? n.toLocaleString('fr-FR') + ' €' : n);
  const dur = (m) => (m >= 60 ? Math.floor(m / 60) + ' h' + (m % 60 ? ' ' + String(m % 60).padStart(2, '0') : '') : m + ' min');
  const pad = (n) => String(n).padStart(2, '0');
  const isoDay = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  let refreshTimer;
  const refreshSoon = () => {
    if (!hasGsap) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => window.ScrollTrigger.refresh(), 120);
  };

  /* ------------------------------------------------------------------
     CARTE (onglets de tarifs)
  ------------------------------------------------------------------- */
  function buildCarte() {
    const tabs = $('#tabs'), panels = $('#panels');
    if (!tabs || !panels || !D.carte) return;

    D.carte.forEach((c, i) => {
      const tab = document.createElement('button');
      tab.type = 'button';
      tab.className = 'tab';
      tab.id = 'tab-' + c.id;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-controls', 'panel-' + c.id);
      tab.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      tab.tabIndex = i === 0 ? 0 : -1;
      tab.textContent = c.label;
      tabs.appendChild(tab);

      const panel = document.createElement('div');
      panel.className = 'panel';
      panel.id = 'panel-' + c.id;
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', tab.id);
      panel.hidden = i !== 0;
      panel.innerHTML =
        (c.note ? '<p class="panel__note">' + c.note + '</p>' : '') +
        c.items.map((it) =>
          '<div class="row"><span class="row__name">' + it[0] + '</span><span class="row__dots" aria-hidden="true"></span>' +
          '<span class="row__time">' + dur(it[1]) + '</span><span class="row__price">' + euro(it[2]) + '</span></div>'
        ).join('');
      panels.appendChild(panel);
    });

    const select = (tab) => {
      $$('.tab', tabs).forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        t.tabIndex = on ? 0 : -1;
        const p = document.getElementById(t.getAttribute('aria-controls'));
        if (p) p.hidden = !on;
      });
      const panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (hasGsap && motionReady && panel) {
        window.gsap.fromTo($$('.row, .panel__note', panel), { y: 26, opacity: 0 },
          { y: 0, opacity: 1, duration: .8, ease: 'power3.out', stagger: .06, clearProps: 'transform,opacity' });
      }
      refreshSoon();
    };

    tabs.addEventListener('click', (e) => {
      const tab = e.target.closest('.tab');
      if (tab) select(tab);
    });
    tabs.addEventListener('keydown', (e) => {
      const list = $$('.tab', tabs);
      const idx = list.indexOf(document.activeElement);
      if (idx < 0) return;
      let n = null;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') n = (idx + 1) % list.length;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') n = (idx - 1 + list.length) % list.length;
      if (e.key === 'Home') n = 0;
      if (e.key === 'End') n = list.length - 1;
      if (n !== null) { e.preventDefault(); list[n].focus(); select(list[n]); }
    });
  }

  /* ------------------------------------------------------------------
     RÉSERVATION : formulaire -> SMS / e-mail / agenda (aucun serveur)
  ------------------------------------------------------------------- */
  function buildBooking() {
    const form = $('#bookForm');
    if (!form || !D.carte) return;
    const fService = $('#fService'), fDate = $('#fDate'), fTime = $('#fTime'), fName = $('#fName');
    const err = $('#fError'), recap = $('#recap');
    const services = {};

    // Options de prestations
    const top = document.createElement('optgroup');
    top.label = 'À la une';
    const russe = new Option('Manucure russe (tarif confirmé en salon)', 'russe');
    services.russe = { name: 'Manucure russe', min: 45 };
    top.appendChild(russe);
    fService.appendChild(top);

    D.carte.forEach((c) => {
      const og = document.createElement('optgroup');
      og.label = c.label;
      c.items.forEach((it, i) => {
        const key = c.id + '-' + i;
        services[key] = { name: it[0], min: it[1] };
        og.appendChild(new Option(it[0] + ' — ' + euro(it[2]), key));
      });
      fService.appendChild(og);
    });
    services.autre = { name: 'Autre demande (à préciser)', min: 60 };
    fService.appendChild(new Option('Autre demande / je ne sais pas encore', 'autre'));

    // Date : à partir d'aujourd'hui
    fDate.min = isoDay(new Date());

    // Heures : 9h30 -> 18h30 (dernier départ avant la fermeture à 19h30)
    for (let m = 9 * 60 + 30; m <= 18 * 60 + 30; m += 30) {
      const v = pad(Math.floor(m / 60)) + ':' + pad(m % 60);
      fTime.appendChild(new Option(v.replace(':', 'h'), v));
    }

    const showError = (msg) => { err.textContent = msg; err.hidden = false; };
    let last = null;

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      err.hidden = true;
      const key = fService.value, date = fDate.value, time = fTime.value, name = fName.value.trim();
      if (!key || !date || !time || !name) { showError('Merci de renseigner la prestation, le jour, l’heure et votre prénom.'); return; }
      const when = new Date(date + 'T' + time + ':00');
      if (when.getDay() === 0) { showError('Le salon est fermé le dimanche. Choisissez un autre jour, du lundi au samedi.'); return; }
      if (when.getTime() < Date.now()) { showError('Ce créneau est déjà passé : choisissez un autre horaire.'); return; }

      const svc = services[key];
      const dateFr = when.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
      const msg = 'Bonjour Chic Nails, c’est ' + name + '. Je souhaiterais réserver « ' + svc.name + ' » le ' + dateFr +
        ' à ' + time.replace(':', 'h') + '. Pouvez-vous me confirmer la disponibilité ? Merci !';
      last = { msg, svc, when };

      $('#recapMsg').textContent = msg;
      $('#recapSms').href = 'sms:' + D.phone + '?&body=' + encodeURIComponent(msg);
      $('#recapMail').href = 'mailto:' + D.email + '?subject=' + encodeURIComponent('Demande de rendez-vous – ' + svc.name) + '&body=' + encodeURIComponent(msg);
      recap.hidden = false;
      recap.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'nearest' });
      refreshSoon();
    });

    $('#recapCopy').addEventListener('click', async (ev) => {
      if (!last) return;
      const label = $('span', ev.currentTarget);
      try { await navigator.clipboard.writeText(last.msg); }
      catch (_) {
        const ta = document.createElement('textarea');
        ta.value = last.msg; document.body.appendChild(ta); ta.select();
        try { document.execCommand('copy'); } catch (__) { /* rien */ }
        ta.remove();
      }
      label.textContent = 'Copié ✓';
      setTimeout(() => { label.textContent = 'Copier'; }, 2200);
    });

    $('#recapIcs').addEventListener('click', () => {
      if (!last) return;
      const f = (d) => d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + 'T' + pad(d.getHours()) + pad(d.getMinutes()) + '00';
      const end = new Date(last.when.getTime() + last.svc.min * 60000);
      const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const lines = [
        'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Chic Nails//Site//FR', 'CALSCALE:GREGORIAN', 'BEGIN:VEVENT',
        'UID:' + Date.now() + '@chic-nails', 'DTSTAMP:' + stamp,
        'DTSTART:' + f(last.when), 'DTEND:' + f(end),
        'SUMMARY:Chic Nails – ' + last.svc.name + ' (à confirmer)',
        'LOCATION:' + D.address.replace(/,/g, '\\,'),
        'DESCRIPTION:Demande à confirmer avec le salon au ' + D.phoneDisplay,
        'END:VEVENT', 'END:VCALENDAR'
      ];
      const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = 'rendez-vous-chic-nails.ics';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  }

  /* ------------------------------------------------------------------
     HORAIRES : ouvert / fermé maintenant + jour du jour
  ------------------------------------------------------------------- */
  function buildHours() {
    const badge = $('#openNow'), text = $('#openNowText'), list = $('#hours');
    if (!badge || !D.hours) return;
    const paris = new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Paris' }));
    const day = paris.getDay();
    const mins = paris.getHours() * 60 + paris.getMinutes();
    const fmt = (h) => h[0] + 'h' + (h[1] ? pad(h[1]) : '');
    const names = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

    if (list && list.children[(day + 6) % 7]) list.children[(day + 6) % 7].classList.add('is-today');

    const today = D.hours[day];
    const toMin = (h) => h[0] * 60 + h[1];
    if (today && mins >= toMin(today[0]) && mins < toMin(today[1])) {
      badge.classList.add('is-open');
      text.textContent = 'Ouvert maintenant · jusqu’à ' + fmt(today[1]);
      return;
    }
    for (let i = 0; i < 8; i++) {
      const d = (day + i) % 7, h = D.hours[d];
      if (!h) continue;
      if (i === 0 && mins >= toMin(h[0])) continue;
      const when = i === 0 ? 'aujourd’hui' : i === 1 ? 'demain' : names[d];
      text.textContent = 'Fermé · ouvre ' + when + ' à ' + fmt(h[0]);
      return;
    }
  }

  /* ------------------------------------------------------------------
     MENU MOBILE + ANCRES
  ------------------------------------------------------------------- */
  function buildMenu() {
    const burger = $('#burger'), menu = $('#menu');
    if (!burger || !menu) return;
    const toggle = (force) => {
      menuOpen = typeof force === 'boolean' ? force : !menu.classList.contains('is-open');
      menu.classList.toggle('is-open', menuOpen);
      menu.setAttribute('aria-hidden', menuOpen ? 'false' : 'true');
      burger.setAttribute('aria-expanded', menuOpen ? 'true' : 'false');
      burger.setAttribute('aria-label', menuOpen ? 'Fermer le menu' : 'Ouvrir le menu');
      if (lenis && motionReady) { menuOpen ? lenis.stop() : lenis.start(); }
      else if (!lenis) { root.style.overflow = menuOpen ? 'hidden' : ''; }
      if (menuOpen) { const a = $('a', menu); if (a) setTimeout(() => a.focus({ preventScroll: true }), 300); }
    };
    burger.addEventListener('click', () => toggle());
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menuOpen) { toggle(false); burger.focus(); } });

    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (id.length < 2) return;
      const target = id === '#top' ? document.body : document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const wasOpen = menuOpen;
      if (wasOpen) toggle(false);
      const go = () => {
        if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
        else target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
        if (id !== '#top') setTimeout(() => { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }, 900);
      };
      wasOpen ? setTimeout(go, 350) : go();
    });
  }

  /* ------------------------------------------------------------------
     SPLIT TEXT (mots ou lettres, avec masque)
  ------------------------------------------------------------------- */
  function split(el, mode) {
    const label = el.textContent.replace(/\s+/g, ' ').trim();
    const walk = (node) => {
      Array.from(node.childNodes).forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((tok) => {
            if (!tok) return;
            if (/^\s+$/.test(tok)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'sw'; w.setAttribute('aria-hidden', 'true');
            const inner = document.createElement('span'); inner.className = 'si';
            if (mode === 'chars') {
              Array.from(tok).forEach((ch) => { const c = document.createElement('span'); c.className = 'sc'; c.textContent = ch; inner.appendChild(c); });
            } else { inner.textContent = tok; }
            w.appendChild(inner); frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1) { walk(n); }
      });
    };
    walk(el);
    el.setAttribute('aria-label', label);
    return $$(mode === 'chars' ? '.sc' : '.si', el);
  }

  /* ------------------------------------------------------------------
     CARROUSEL D'AVIS
  ------------------------------------------------------------------- */
  function buildCarousel() {
    const track = $('#carTrack');
    if (!track) return;
    const slides = $$('.slide', track);
    const viewport = track.parentElement;
    const now = $('#carNow'), bar = $('#carBar');
    let i = 0, timer = null, dragging = false;

    const setX = (x, instant) => {
      if (hasGsap && !reduce) window.gsap.to(track, { x, duration: instant ? 0 : 1.1, ease: 'expo.out', overwrite: true });
      else track.style.transform = 'translate3d(' + x + 'px,0,0)';
    };
    const go = (n, instant) => {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      const padL = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      const maxShift = Math.max(0, track.scrollWidth - viewport.clientWidth);
      setX(-Math.min(slides[i].offsetLeft - padL, maxShift), instant);
      now.textContent = pad(i + 1);
      bar.style.transform = 'scaleX(' + ((i + 1) / slides.length) + ')';
      bar.style.transition = 'transform .8s cubic-bezier(.16,1,.3,1)';
    };
    const play = () => { if (reduce) return; stop(); timer = setInterval(() => go(i + 1), 7000); };
    const stop = () => { clearInterval(timer); timer = null; };

    $('#carPrev').addEventListener('click', () => { go(i - 1); play(); });
    $('#carNext').addEventListener('click', () => { go(i + 1); play(); });
    viewport.addEventListener('mouseenter', stop);
    viewport.addEventListener('mouseleave', play);
    viewport.addEventListener('focusin', stop);
    viewport.addEventListener('focusout', play);
    viewport.setAttribute('tabindex', '0');
    viewport.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { go(i + 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft') { go(i - 1); e.preventDefault(); }
    });

    let sx = 0, dx = 0;
    track.addEventListener('pointerdown', (e) => { dragging = true; sx = e.clientX; dx = 0; track.setPointerCapture(e.pointerId); stop(); });
    track.addEventListener('pointermove', (e) => { if (dragging) dx = e.clientX - sx; });
    const end = () => { if (!dragging) return; dragging = false; if (dx < -50) go(i + 1); else if (dx > 50) go(i - 1); play(); };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    window.addEventListener('resize', () => go(i, true));
    document.addEventListener('visibilitychange', () => { document.hidden ? stop() : play(); });

    go(0, true);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((en) => { en[0].isIntersecting ? play() : stop(); }, { threshold: .25 }).observe(viewport);
    } else { play(); }
  }

  /* ------------------------------------------------------------------
     LOADER (sans GSAP : on le retire)
  ------------------------------------------------------------------- */
  function dropLoader() {
    const l = $('.loader');
    if (l) l.style.display = 'none';
  }

  /* ==================================================================
     MOUVEMENT
  =================================================================== */
  function initMotion() {
    const gsap = window.gsap, ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({ ignoreMobileResize: true });
    root.classList.add('anim');

    /* ---- Smooth scroll (Lenis) piloté par le ticker GSAP ---- */
    if (window.Lenis) {
      lenis = new window.Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((t) => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
      lenis.stop();
    }
    window.scrollTo(0, 0);

    const mm = gsap.matchMedia();
    const video = $('.hero__media video');

    /* ---- Titre du hero : lettres masquées ---- */
    const heroTitle = $('[data-hero-title]');
    const heroChars = split(heroTitle, 'chars');
    gsap.set(heroTitle, { visibility: 'visible' });

    /* ---- Intro du hero (créée en pause, jouée à la sortie du loader) ---- */
    const intro = gsap.timeline({ paused: true, defaults: { ease: 'expo.out' } });
    intro
      .from('.hero__media video', { scale: 1.4, duration: 2.8 }, 0)
      .from('.hero__word span', { yPercent: 35, opacity: 0, duration: 2.2 }, 0.1)
      .from('.eyebrow', { y: 24, opacity: 0, duration: 1.1 }, 0.35)
      .from(heroChars, { yPercent: 120, duration: 1.5, stagger: 0.03 }, 0.25)
      .from('.hero__lede', { y: 34, opacity: 0, duration: 1.2 }, 0.85)
      .from('.hero__cta .btn', { y: 34, opacity: 0, duration: 1.1, stagger: 0.1 }, 1.0)
      .from('.hero__almond .pimg', { scale: 0.55, opacity: 0, duration: 1.8, stagger: 0.2 }, 0.5)
      .from('.hero__drop', { y: -180, opacity: 0, duration: 1.6, ease: 'bounce.out' }, 1.1)
      .from('.head', { yPercent: -100, duration: 1.2, clearProps: 'transform' }, 0.9)
      .from('.hero__scroll', { opacity: 0, duration: 1 }, 1.6)
      .add(() => {
        // Ken Burns lent sur la vidéo
        gsap.to(video, { scale: 1.12, duration: 20, ease: 'sine.inOut', yoyo: true, repeat: -1 });
      }, 2.4);

    /* ---- Loader : lacque qui monte + compteur, puis rideau ---- */
    const loader = $('.loader'), fill = $('.loader__fill'), countEl = $('.loader__count b');
    const lb = $$('.loader__brand .l1 > span, .loader__brand .l2 > span');
    const prog = { v: 0 };
    gsap.set(lb, { yPercent: 115 });
    gsap.set(fill, { y: 0, yPercent: 100 }); // y:0 neutralise le translateY(100%) lu en pixels depuis le CSS

    const videoReady = new Promise((res) => {
      if (!video || video.readyState >= 3) return res();
      video.addEventListener('canplay', res, { once: true });
      video.addEventListener('error', res, { once: true });
      setTimeout(res, 4500);
    });
    const fontsReady = (document.fonts && document.fonts.ready) ? document.fonts.ready : Promise.resolve();
    if (video) { const p = video.play(); if (p && p.catch) p.catch(() => {}); }

    const fillDone = new Promise((res) => {
      const tl = gsap.timeline({ onComplete: res });
      tl.to(lb, { yPercent: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12 }, 0.1)
        .to(fill, { yPercent: 0, duration: 2.1, ease: 'power3.inOut' }, 0)
        .to(prog, { v: 100, duration: 2.1, ease: 'power3.inOut', onUpdate: () => { countEl.textContent = Math.round(prog.v); } }, 0);
    });

    // On n'attend jamais plus de 3,5 s les médias : le loader ne doit pas bloquer le site
    const assets = Promise.race([Promise.all([videoReady, fontsReady]), new Promise((res) => setTimeout(res, 3500))]);
    Promise.all([fillDone, assets]).then(() => {
      const out = gsap.timeline();
      out.to(lb, { yPercent: -115, duration: 0.7, ease: 'expo.in', stagger: 0.07 }, 0.15)
        .to(loader, { yPercent: -100, y: () => -window.innerWidth * 0.14, duration: 1.4, ease: 'expo.inOut' }, 0.55)
        .add(() => { intro.play(); }, 0.95)
        .add(() => {
          loader.style.display = 'none';
          motionReady = true;
          if (lenis && !menuOpen) lenis.start();
          ScrollTrigger.refresh();
        }, 2.0);
    });

    /* ---- Barre de progression de lecture ---- */
    gsap.to('.progress span', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.3 } });

    /* ---- Header : se cache en descendant, revient en remontant ---- */
    const head = $('#head');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        head.classList.toggle('is-solid', y > 60);
        head.classList.toggle('is-hidden', self.direction === 1 && y > 320 && !menuOpen);
      }
    });

    /* ---- Dock mobile ---- */
    const dock = $('.dock'), bookSec = $('#reserver');
    if (dock) {
      ScrollTrigger.create({
        start: 0, end: 'max',
        onUpdate: (self) => {
          const r = bookSec.getBoundingClientRect();
          const inBooking = r.top < innerHeight * 0.55 && r.bottom > innerHeight * 0.25;
          dock.classList.toggle('is-on', self.scroll() > innerHeight * 0.7 && self.scroll() < ScrollTrigger.maxScroll(window) - 500 && !inBooking);
        }
      });
    }

    /* ---- HERO : parallax multicouche ---- */
    const hp = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    hp.to('.hero__media', { yPercent: 14, ease: 'none' }, 0)
      .to('.hero__word', { xPercent: -12, yPercent: 22, ease: 'none' }, 0)
      .to('.hero__almond.a1', { y: -170, ease: 'none' }, 0)
      .to('.hero__almond.a2', { y: -320, ease: 'none' }, 0)
      .to('.hero__drop', { y: -560, rotate: 28, ease: 'none' }, 0)
      .to('.hero__inner', { y: -90, opacity: 0.1, ease: 'none' }, 0);
    ScrollTrigger.create({
      trigger: '.hero', start: 'top top', end: 'bottom top',
      onLeave: () => video && video.pause(), onEnterBack: () => video && video.play().catch(() => {})
    });

    /* ---- RUBANS : vitesse et sens liés au scroll ---- */
    let scrollDir = 1, boost = 0, boostTarget = 0;
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        boostTarget = Math.min(Math.abs(self.getVelocity()) / 320, 9);
        if (self.direction) scrollDir = self.direction;
      }
    });
    $$('[data-marquee]').forEach((m) => {
      const row = $('.marquee__row', m);
      for (let k = 0; k < 3; k++) { const c = row.cloneNode(true); c.setAttribute('aria-hidden', 'true'); m.appendChild(c); }
      const base = parseFloat(m.dataset.marquee) || 1;
      let w = row.offsetWidth, x = 0;
      const measure = () => { w = row.offsetWidth; };
      window.addEventListener('resize', measure);
      gsap.ticker.add((time, delta) => {
        boostTarget *= 0.93;
        boost += (boostTarget - boost) * 0.08;
        const speed = 55 * (1 + boost);
        x += base * -1 * scrollDir * speed * (delta / 1000);
        if (w > 0) { if (x <= -w) x += w; if (x > 0) x -= w; }
        m.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
      });
    });

    /* ---- LE BAR : section épinglée, storytelling en 4 temps ---- */
    const steps = $$('.step'), imgs = $$('.story__img'), N = steps.length;
    const countB = $('.story__count b');
    gsap.set(steps, { autoAlpha: 0 });
    gsap.set(steps[0], { autoAlpha: 1 });
    imgs.forEach((im, k) => {
      if (k > 0) gsap.set(im, { yPercent: 100 });
      gsap.set($('img', im), { scale: k === 0 ? 1.06 : 1.3, yPercent: k === 0 ? 0 : -30 });
    });
    const story = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: '.story', start: 'top top', end: '+=330%', pin: true, scrub: 0.6, anticipatePin: 1 },
      onUpdate: () => {
        const idx = Math.min(N - 1, Math.floor(story.time() + 0.3));
        countB.textContent = pad(idx + 1);
      }
    });
    for (let k = 1; k < N; k++) {
      story
        .to(steps[k - 1], { autoAlpha: 0, y: -50, duration: 0.35, ease: 'power2.in' }, k - 0.2)
        .fromTo(steps[k], { autoAlpha: 0, y: 60 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' }, k + 0.05)
        .to(imgs[k], { yPercent: 0, duration: 0.7, ease: 'power2.inOut' }, k - 0.3)
        .to($('img', imgs[k]), { yPercent: 0, scale: 1.06, duration: 0.7, ease: 'power2.inOut' }, k - 0.3)
        .to('.story__rail i', { scaleX: k / (N - 1), duration: 0.5 }, k - 0.2);
    }
    story.to({}, { duration: 0.5 });
    gsap.set('.story__rail i', { scaleX: 0 });

    /* ---- PRESTATIONS : défilement horizontal piloté par le scroll vertical ---- */
    mm.add('(min-width: 900px)', () => {
      const track = $('.hscroll__track');
      const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
      const tween = gsap.to(track, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: { trigger: '.hscroll', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, invalidateOnRefresh: true, anticipatePin: 1 }
      });
      $$('.card', track).forEach((card) => {
        const img = $('.pimg img', card);
        if (img) gsap.fromTo(img, { xPercent: -7 }, { xPercent: 7, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
        gsap.from(card, { y: 80, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left 92%', once: true } });
      });
    });

    /* ---- CHIFFRES : compteurs ---- */
    $$('[data-count]').forEach((el) => {
      const end = parseFloat(el.dataset.count), dec = parseInt(el.dataset.dec || '0', 10);
      const o = { v: 0 };
      const fmt = (v) => v.toLocaleString('fr-FR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
      el.textContent = fmt(0);
      ScrollTrigger.create({
        trigger: el, start: 'top 88%', once: true,
        onEnter: () => gsap.to(o, { v: end, duration: 2.4, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } })
      });
    });
    gsap.from('.num', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: '.numbers__grid', start: 'top 85%', once: true } });

    /* ---- Gouttes de vernis (fil rouge) ---- */
    $$('.drips').forEach((svg) => {
      const drops = $$('.drip', svg);
      gsap.set(drops, { scaleY: 0 });
      ScrollTrigger.create({
        trigger: svg, start: 'top 100%', once: true,
        onEnter: () => gsap.to(drops, { scaleY: 1, duration: 1.8, ease: 'power3.out', stagger: { each: 0.12, from: 'random' } })
      });
    });

    /* ---- LA CARTE : lignes qui entrent ---- */
    ScrollTrigger.create({
      trigger: '#panels', start: 'top 85%', once: true,
      onEnter: () => gsap.fromTo($$('.panel:not([hidden]) .row'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out', stagger: 0.07, clearProps: 'transform,opacity' })
    });

    /* ---- GALERIE : colonnes en parallaxe ---- */
    mm.add('(min-width: 900px)', () => {
      $$('.gal__col').forEach((col) => {
        const sp = parseFloat(col.dataset.speed) || 0;
        gsap.fromTo(col, { y: () => -sp * innerHeight * 0.9 }, { y: () => sp * innerHeight * 0.9, ease: 'none', scrollTrigger: { trigger: '.gal', start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
      });
    });

    /* ---- PETITS PLUS : badge qui tourne, icônes qui se dessinent ---- */
    gsap.to('.perks__badge > svg:first-child', { rotation: 360, ease: 'none', transformOrigin: '50% 50%', scrollTrigger: { trigger: '.perks', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.from('.perks__drop', { scale: 0, rotate: -40, duration: 1.4, ease: 'elastic.out(1,.5)', scrollTrigger: { trigger: '.perks', start: 'top 70%', once: true } });
    $$('.perks__list li').forEach((li) => {
      const svg = $('svg', li);
      const parts = $$('path, circle, rect', svg);
      parts.forEach((p) => { const L = p.getTotalLength ? Math.ceil(p.getTotalLength()) : 0; gsap.set(p, { strokeDasharray: L, strokeDashoffset: L }); });
      const t = gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 88%', once: true } });
      t.to(parts, { strokeDashoffset: 0, duration: 1.7, ease: 'power2.inOut', stagger: 0.12 })
        .from($('div', li), { x: 24, opacity: 0, duration: 1, ease: 'power3.out' }, 0.2);
    });

    /* ---- CTA : disque de lacque qui s'agrandit ---- */
    gsap.to('.cta__disc', { scale: 1, ease: 'none', scrollTrigger: { trigger: '.cta', start: 'top 85%', end: 'top 10%', scrub: true } });

    /* ---- Footer : nom géant lettre par lettre ---- */
    const giant = $('[data-foot-giant]');
    if (giant) {
      const chars = split(giant, 'chars');
      giant.setAttribute('aria-hidden', 'true'); giant.removeAttribute('aria-label');
      gsap.from(chars, { yPercent: 115, duration: 1.4, ease: 'expo.out', stagger: 0.05, scrollTrigger: { trigger: giant, start: 'top 92%', once: true } });
    }

    /* ---- Titres (mots masqués) et apparitions ---- */
    $$('[data-split]').forEach((el) => {
      const parts = split(el, 'words');
      gsap.set(el, { visibility: 'visible' });
      gsap.from(parts, { yPercent: 118, duration: 1.3, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
    });
    $$('[data-reveal]').forEach((el) => {
      gsap.fromTo(el, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });

    /* ---- Images : rideau + parallaxe interne ---- */
    $$('.fig .pimg, .card__img .pimg').forEach((w) => {
      const veil = document.createElement('i'); veil.className = 'curtain-veil'; veil.setAttribute('aria-hidden', 'true');
      w.appendChild(veil);
      gsap.to(veil, { scaleY: 0, duration: 1.4, ease: 'expo.inOut', transformOrigin: '50% 0%',
        scrollTrigger: { trigger: w, start: 'top 90%', once: true } });
    });
    mm.add('(min-width: 900px)', () => {
      $$('.pimg').forEach((w) => {
        if (w.closest('.hscroll') || w.closest('.hero')) return;
        const img = $('img', w);
        gsap.fromTo(img, { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: w, start: 'top bottom', end: 'bottom top', scrub: true } });
      });
    });

    /* ---- Micro-interactions (souris fine uniquement) ---- */
    if (finePointer) {
      // Boutons magnétiques
      $$('[data-magnetic]').forEach((btn) => {
        const inner = $('span', btn);
        btn.addEventListener('pointermove', (e) => {
          const r = btn.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          gsap.to(btn, { x: dx * 0.28, y: dy * 0.4, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
          if (inner) gsap.to(inner, { x: dx * 0.12, y: dy * 0.18, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
        });
        btn.addEventListener('pointerleave', () => {
          gsap.to(inner ? [btn, inner] : btn, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,.45)', overwrite: 'auto' });
        });
      });
      // Inclinaison 3D + reflet qui suit la souris
      $$('[data-tilt]').forEach((el) => {
        const max = el.classList.contains('card') ? 9 : 7;
        el.addEventListener('pointermove', (e) => {
          const r = el.getBoundingClientRect();
          const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
          gsap.to(el, { rotateY: (px - 0.5) * max * 2, rotateX: -(py - 0.5) * max * 2, transformPerspective: 900, duration: 0.5, ease: 'power3.out', overwrite: 'auto' });
          el.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          el.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
        el.addEventListener('pointerleave', () => gsap.to(el, { rotateX: 0, rotateY: 0, duration: 1, ease: 'elastic.out(1,.5)', overwrite: 'auto' }));
      });
      // Curseur goutte
      const cur = $('.cursor');
      if (cur) {
        const xTo = gsap.quickTo(cur, 'x', { duration: 0.35, ease: 'power3' });
        const yTo = gsap.quickTo(cur, 'y', { duration: 0.35, ease: 'power3' });
        window.addEventListener('pointermove', (e) => { xTo(e.clientX); yTo(e.clientY); cur.classList.remove('is-hidden'); }, { passive: true });
        document.addEventListener('pointerover', (e) => cur.classList.toggle('is-link', !!e.target.closest('a, button, [data-tilt], input, select, label')));
        document.documentElement.addEventListener('mouseleave', () => cur.classList.add('is-hidden'));
      }
    }

    /* ---- Mise en ordre finale ---- */
    ScrollTrigger.sort();
    ScrollTrigger.refresh();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
    window.addEventListener('load', () => ScrollTrigger.refresh());
  }

  /* ------------------------------------------------------------------
     DÉMARRAGE
  ------------------------------------------------------------------- */
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
  buildCarte();
  buildBooking();
  buildHours();
  buildMenu();
  buildCarousel();

  if (!hasGsap || reduce) {
    dropLoader();
    return;
  }
  try {
    initMotion();
  } catch (err) {
    console.error('[Chic Nails] animations désactivées :', err);
    root.classList.remove('anim');
    dropLoader();
    if (lenis) { lenis.destroy(); lenis = null; }
  }
})();
