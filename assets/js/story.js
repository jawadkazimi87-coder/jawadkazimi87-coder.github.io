/* ==========================================================================
   Kazimi Digital — Scroll-Storytelling
   Ein einziger requestAnimationFrame-Loop steuert alles, was am Scrollen
   hängt: Videoposition, Textphasen, Fortschrittsanzeige und Farbtemperatur.
   Ohne Video, ohne JavaScript oder bei reduzierter Bewegung bleibt die
   Geschichte als statische Fassung vollständig lesbar.
   ========================================================================== */

(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var debug = /[?&]debug=1/.test(window.location.search);

  var clamp = function (v, min, max) { return v < min ? min : v > max ? max : v; };

  /* Weicher Ein-/Ausstieg statt harter Schnitte. */
  var smoothstep = function (edge0, edge1, x) {
    var t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  };

  /* ---------------------------------------------------------------- Story */

  function initStory() {
    var story = document.querySelector('[data-story]');
    if (!story) return;

    var stage = document.querySelector('[data-stage]');
    var video = document.querySelector('[data-video]');
    var beats = Array.prototype.slice.call(story.querySelectorAll('.beat'));
    var steps = Array.prototype.slice.call(story.querySelectorAll('.rail__step'));
    var scrub = story.querySelector('[data-scrub]');
    var cue = story.querySelector('[data-scrollcue]');
    var panel = story.querySelector('[data-debug]');

    var timeline = beats.map(function (el, i) {
      return {
        el: el,
        start: parseFloat(el.dataset.start) || 0,
        end: parseFloat(el.dataset.end) || 1,
        first: i === 0,
        last: i === beats.length - 1,
        /* Nur Beats mit Links müssen ausgeblendet werden, damit die
           Tabulator-Reihenfolge nicht durch unsichtbare Ziele läuft. */
        interactive: !!el.querySelector('a, button'),
        p: -1
      };
    });

    var ranges = steps.map(function (el) {
      return { el: el, from: parseFloat(el.dataset.from) || 0, to: parseFloat(el.dataset.to) || 1 };
    });

    var top = 0;
    var span = 1;
    var progress = 0;
    var videoTime = 0;
    var duration = 0;
    var hasVideo = false;
    var running = false;
    var lastFrame = 0;
    var activeStep = -1;

    function measure() {
      var rect = story.getBoundingClientRect();
      top = rect.top + window.scrollY;
      span = Math.max(1, story.offsetHeight - window.innerHeight);
    }

    /* -------------------------------------------------- Video vorbereiten */

    function loadVideo() {
      if (!video || reduced) {
        if (stage) stage.classList.add('no-video');
        return;
      }

      /* Quellenkette: bevorzugte Datei zuerst, dann die nächstbeste.
         Fehlt eine Datei, wird still auf die nächste gewechselt — die Seite
         bleibt auch dann funktionsfähig, wenn nur ein Video abgelegt wurde. */
      var mobile = window.matchMedia('(max-width: 860px)').matches;
      var d = video.dataset;
      var sources = [];

      if (mobile) {
        if (d.srcMobile) sources.push(d.srcMobile);
        if (d.srcDesktop) sources.push(d.srcDesktop);
      } else {
        if (d.srcWebm && video.canPlayType('video/webm; codecs="vp9"') === 'probably') sources.push(d.srcWebm);
        if (d.srcDesktop) sources.push(d.srcDesktop);
        if (d.srcMobile) sources.push(d.srcMobile);
      }

      var index = 0;
      var useSource = function () {
        if (index >= sources.length) {
          if (stage) stage.classList.add('no-video');
          hasVideo = false;
          return;
        }
        video.src = sources[index++];
        video.load();
      };

      video.addEventListener('error', useSource);

      video.addEventListener('loadedmetadata', function () {
        duration = video.duration || 0;
        hasVideo = duration > 0;
        if (hasVideo) {
          video.classList.add('is-ready');
          if (stage) stage.classList.remove('no-video');
          video.pause();
          request();
        }
      });

      /* iOS gibt das Suchen in einem pausierten Video erst nach einer
         Nutzerinteraktion frei. Einmal kurz anspielen genügt. */
      var prime = function () {
        var attempt = video.play();
        if (attempt && typeof attempt.then === 'function') {
          attempt.then(function () { video.pause(); }).catch(function () { });
        }
        window.removeEventListener('touchstart', prime);
        window.removeEventListener('pointerdown', prime);
      };
      window.addEventListener('touchstart', prime, { passive: true, once: true });
      window.addEventListener('pointerdown', prime, { once: true });

      useSource();
    }

    /* ------------------------------------------------------- Bildaufbau je Frame */

    function paint(now) {
      running = false;
      var dt = lastFrame ? Math.min(64, now - lastFrame) : 16.7;
      lastFrame = now;

      var target = clamp((window.scrollY - top) / span, 0, 1);
      progress += (target - progress) * (1 - Math.pow(0.001, dt / 1000));
      if (Math.abs(target - progress) < 0.0004) progress = target;

      root.style.setProperty('--t', progress.toFixed(4));
      if (scrub) scrub.style.transform = 'scaleX(' + progress.toFixed(4) + ')';

      /* Textphasen */
      for (var i = 0; i < timeline.length; i++) {
        var b = timeline[i];
        var local = (progress - b.start) / Math.max(0.0001, b.end - b.start);
        var inPhase = b.first ? 1 : smoothstep(0, 0.2, local);
        var outPhase = b.last ? 1 : 1 - smoothstep(0.8, 1, local);
        var p = clamp(inPhase * outPhase, 0, 1);
        if (local < -0.05 || local > 1.05) p = 0;

        if (Math.abs(p - b.p) > 0.004) {
          b.p = p;
          b.el.style.setProperty('--p', p.toFixed(3));
          b.el.style.opacity = p.toFixed(3);
          var active = p > 0.5;
          b.el.classList.toggle('is-active', active);
          if (b.interactive) b.el.inert = !active;
        }
      }

      /* Kapitelanzeige */
      for (var s = 0; s < ranges.length; s++) {
        if (progress >= ranges[s].from && progress < ranges[s].to && activeStep !== s) {
          if (activeStep > -1) ranges[activeStep].el.classList.remove('is-active');
          ranges[s].el.classList.add('is-active');
          activeStep = s;
        }
      }

      if (cue) cue.classList.toggle('is-gone', progress > 0.04);

      /* Video weich nachziehen — nie springen lassen.
         readyState 1 (Metadaten) genügt: Der Browser lädt den benötigten
         Bereich beim Suchen nach. Würde hier auf 2 gewartet, käme ein
         nicht vorgepuffertes Video nie in Gang. */
      if (hasVideo && video.readyState >= 1) {
        var wanted = progress * duration;
        videoTime += (wanted - videoTime) * (1 - Math.pow(0.0000015, dt / 1000));
        if (Math.abs(video.currentTime - videoTime) > 1 / 50) {
          try { video.currentTime = videoTime; } catch (e) { /* ignoriert */ }
        }
        if (Math.abs(wanted - videoTime) > 0.01) request();
      }

      if (Math.abs(target - progress) > 0.0004) request();

      if (panel) {
        panel.textContent =
          'Fortschritt  ' + progress.toFixed(3) +
          '\nVideozeit    ' + (hasVideo ? videoTime.toFixed(2) + ' / ' + duration.toFixed(2) + ' s' : '— kein Video') +
          '\nKapitel      ' + (activeStep + 1);
      }
    }

    function request() {
      if (running) return;
      running = true;
      window.requestAnimationFrame(paint);
    }

    /* --------------------------------------------------------------- Start */

    if (reduced) {
      if (stage) stage.classList.add('no-video');
      beats.forEach(function (el) {
        el.style.opacity = '1';
        el.style.setProperty('--p', '1');
        el.classList.add('is-active');
      });
      root.style.setProperty('--t', '1');
      return;
    }

    if (panel && debug) panel.hidden = false;

    measure();
    loadVideo();
    request();

    window.addEventListener('scroll', request, { passive: true });

    var resizeTimer;
    var onResize = function () {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        measure();
        request();
      }, 140);
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    window.addEventListener('load', function () { measure(); request(); });
  }

  /* ----------------------------------------------------------- Navigation */

  function initNav() {
    var head = document.getElementById('masthead');
    var nav = document.getElementById('mainnav');
    var toggle = document.getElementById('menutoggle');
    if (!head) return;

    var last = 0;
    var ticking = false;

    var update = function () {
      ticking = false;
      var y = window.scrollY;
      head.classList.toggle('is-stuck', y > 40);
      var open = nav && nav.classList.contains('is-open');
      head.classList.toggle('is-hidden', !open && y > 640 && y > last + 4);
      last = y;
    };

    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    }, { passive: true });

    if (!toggle || !nav) return;

    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      nav.classList.toggle('is-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) head.classList.remove('is-hidden');
    };

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });

    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        toggle.focus();
      }
    });
  }

  /* -------------------------------------------------- Einblenden im Blick */

  function initReveal() {
    var items = document.querySelectorAll('.reveal, .node');
    if (!('IntersectionObserver' in window) || reduced) {
      Array.prototype.forEach.call(items, function (el) {
        el.classList.add('is-in', 'is-lit');
      });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        if (entry.target.classList.contains('node')) entry.target.classList.add('is-lit');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.15 });

    Array.prototype.forEach.call(items, function (el, i) {
      /* Gestaffelte Verzögerung nur für reine Textblöcke — bei den
         Leistungszeilen würde sie die Hover-Reaktion träge machen. */
      if (!el.classList.contains('node')) {
        el.style.transitionDelay = (Math.min(i % 4, 3) * 70) + 'ms';
      }
      io.observe(el);
    });
  }

  /* ------------------------------------------------- Fehlende Bilder abfangen */

  function initImageFallbacks() {
    var slots = [
      ['.project__frame', 'Projektbild'],
      ['.about__portrait', 'Porträt']
    ];
    slots.forEach(function (pair) {
      Array.prototype.forEach.call(document.querySelectorAll(pair[0]), function (frame) {
        var img = frame.querySelector('img');
        if (!img) return;
        frame.setAttribute('data-slot', pair[1]);
        var fail = function () { frame.classList.add('is-missing'); };
        if (img.complete && img.naturalWidth === 0) fail();
        img.addEventListener('error', fail);
      });
    });
  }

  /* --------------------------------------------------------------- Formular */

  /* Statische Seite ohne Backend: Wenn kein Endpunkt hinterlegt ist, wird
     die Anfrage als vorbereitete E-Mail übergeben. Für einen echten
     Formularversand hier die Endpunkt-URL eintragen (z. B. Formspree). */
  var FORM_ENDPOINT = '';
  var MAIL_TO = 'jawadkazimi87@gmail.com';

  function initForm() {
    var form = document.getElementById('kontaktformular');
    if (!form) return;
    var status = form.querySelector('[data-formstatus]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      if (!form.checkValidity()) {
        form.reportValidity();
        if (status) status.textContent = 'Bitte Name, E-Mail und Nachricht ausfüllen.';
        return;
      }

      var data = new FormData(form);
      var name = (data.get('name') || '').toString().trim();
      var firma = (data.get('unternehmen') || '').toString().trim();
      var mail = (data.get('email') || '').toString().trim();
      var text = (data.get('nachricht') || '').toString().trim();

      if (FORM_ENDPOINT) {
        if (status) status.textContent = 'Wird gesendet …';
        fetch(FORM_ENDPOINT, {
          method: 'POST',
          headers: { Accept: 'application/json' },
          body: data
        }).then(function (res) {
          if (!res.ok) throw new Error('Fehler');
          form.reset();
          if (status) status.textContent = 'Danke — die Nachricht ist angekommen.';
        }).catch(function () {
          if (status) status.textContent = 'Senden fehlgeschlagen. Bitte direkt an ' + MAIL_TO + ' schreiben.';
        });
        return;
      }

      var subject = 'Projektanfrage' + (firma ? ' — ' + firma : '');
      var body =
        'Name: ' + name + '\n' +
        'Unternehmen: ' + (firma || '—') + '\n' +
        'E-Mail: ' + mail + '\n\n' +
        text + '\n';

      window.location.href = 'mailto:' + MAIL_TO +
        '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body);

      if (status) status.textContent = 'Ihr E-Mail-Programm öffnet sich mit der fertigen Nachricht.';
    });
  }

  /* ------------------------------------------------------------- Kleinkram */

  function initMisc() {
    var year = document.querySelector('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());
  }


  /* ------------------------------------------------- Sichtbarkeits-Check */
  /* Fünf Fragen, sofortige Auswertung im Browser. Es werden keine Daten
     übertragen — das Ergebnis entsteht ausschließlich lokal. */

  var CHECK = [
    {
      q: 'Wie alt ist Ihre aktuelle Website?',
      a: [
        ['Wir haben keine Website', 0],
        ['Älter als vier Jahre', 1],
        ['Ein bis drei Jahre', 3],
        ['Dieses Jahr neu gebaut', 4]
      ],
      luecke: 'Eine veraltete oder fehlende Website kostet Anfragen, bevor das Gespräch beginnt.'
    },
    {
      q: 'Wie viele Anfragen kommen pro Monat über die Website?',
      a: [
        ['Keine', 0],
        ['Ein bis fünf', 2],
        ['Sechs bis zwanzig', 3],
        ['Mehr als zwanzig', 4]
      ],
      luecke: 'Besucher werden nicht zu Anfragen — meist liegt es an Aufbau und Kontaktweg.'
    },
    {
      q: 'Erscheinen Sie bei Google, wenn jemand Ihre Leistung in Ihrer Region sucht?',
      a: [
        ['Nein oder unbekannt', 0],
        ['Erst ab Seite zwei', 1],
        ['Unter den ersten fünf', 3],
        ['Auf den Plätzen eins bis drei', 4]
      ],
      luecke: 'Ohne Platzierung auf Seite eins findet die Suche ohne Sie statt.'
    },
    {
      q: 'Läuft aktuell bezahlte Werbung für Ihren Betrieb?',
      a: [
        ['Nein', 1],
        ['Ja, aber ohne Auswertung', 2],
        ['Ja, mit monatlicher Auswertung', 4]
      ],
      luecke: 'Werbung ohne Auswertung verbrennt Budget an den falschen Stellen.'
    },
    {
      q: 'Wissen Sie, welche Seite die meisten Anfragen erzeugt?',
      a: [
        ['Nein', 0],
        ['Ungefähr', 2],
        ['Ja, mit Zahlen belegt', 4]
      ],
      luecke: 'Ohne Messung bleibt jede Verbesserung Vermutung.'
    }
  ];

  var STUFEN = [
    { bis: 34, titel: 'Digital kaum sichtbar.', rat: 'Der Betrieb existiert online praktisch nicht. Der größte Hebel liegt nicht in Werbung, sondern in einer Website, die gefunden wird und Anfragen aufnimmt.' },
    { bis: 59, titel: 'Basis vorhanden, Sichtbarkeit fehlt.', rat: 'Die Website ist da, aber sie arbeitet nicht. Mit gezieltem SEO und einem klaren Weg zur Anfrage lässt sich hier am schnellsten etwas bewegen.' },
    { bis: 79, titel: 'Solide Grundlage mit klaren Lücken.', rat: 'Vieles läuft bereits. Jetzt entscheidet die Feinarbeit: Messung, Inhalte und Kampagnen, die auf die stärksten Seiten einzahlen.' },
    { bis: 100, titel: 'Gut aufgestellt.', rat: 'Sie machen das Wesentliche richtig. Der nächste Schritt ist Skalierung: mehr Reichweite auf dem, was nachweislich funktioniert.' }
  ];

  function initCheck() {
    var root = document.querySelector('[data-check]');
    if (!root) return;

    var bar = root.querySelector('[data-check-bar]');
    var stage = root.querySelector('[data-check-stage]');
    var index = 0;
    var punkte = [];

    var max = CHECK.reduce(function (n, f) {
      return n + Math.max.apply(null, f.a.map(function (o) { return o[1]; }));
    }, 0);

    function fortschritt(n) {
      if (bar) bar.style.width = Math.round(n / CHECK.length * 100) + '%';
    }

    function frage() {
      var f = CHECK[index];
      var wrap = document.createElement('div');
      wrap.className = 'check__step is-shown';

      var zaehler = document.createElement('p');
      zaehler.className = 'check__count';
      zaehler.textContent = 'Frage ' + (index + 1) + ' von ' + CHECK.length;
      wrap.appendChild(zaehler);

      var titel = document.createElement('p');
      titel.className = 'check__q';
      titel.textContent = f.q;
      wrap.appendChild(titel);

      var liste = document.createElement('div');
      liste.className = 'check__options';
      f.a.forEach(function (opt) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'check__opt';
        b.textContent = opt[0];
        b.addEventListener('click', function () {
          punkte[index] = opt[1];
          index++;
          fortschritt(index);
          index < CHECK.length ? frage() : ergebnis();
        });
        liste.appendChild(b);
      });
      wrap.appendChild(liste);

      if (index > 0) {
        var zurueck = document.createElement('button');
        zurueck.type = 'button';
        zurueck.className = 'check__back';
        zurueck.textContent = '← Eine Frage zurück';
        zurueck.addEventListener('click', function () {
          index--;
          fortschritt(index);
          frage();
        });
        wrap.appendChild(zurueck);
      }

      stage.replaceChildren(wrap);
      var erste = wrap.querySelector('.check__opt');
      if (erste && index > 0) erste.focus();
    }

    function ergebnis() {
      var summe = punkte.reduce(function (a, b) { return a + b; }, 0);
      var wert = Math.round(summe / max * 100);
      var stufe = STUFEN.find(function (s) { return wert <= s.bis; }) || STUFEN[3];

      var wrap = document.createElement('div');
      wrap.className = 'check__step is-shown';
      wrap.setAttribute('role', 'status');

      var kopf = document.createElement('p');
      kopf.className = 'check__score';
      var zahl = document.createElement('b');
      zahl.textContent = String(wert);
      var von = document.createElement('span');
      von.textContent = 'von 100 Sichtbarkeitspunkten';
      kopf.append(zahl, von);
      wrap.appendChild(kopf);

      var titel = document.createElement('p');
      titel.className = 'check__verdict';
      titel.textContent = stufe.titel;
      wrap.appendChild(titel);

      var rat = document.createElement('p');
      rat.className = 'check__advice';
      rat.textContent = stufe.rat;
      wrap.appendChild(rat);

      var luecken = CHECK.filter(function (f, i) { return punkte[i] <= 2; });
      if (luecken.length) {
        var ul = document.createElement('ul');
        ul.className = 'check__gaps';
        luecken.slice(0, 4).forEach(function (f) {
          var li = document.createElement('li');
          li.textContent = f.luecke;
          ul.appendChild(li);
        });
        wrap.appendChild(ul);
      }

      var aktionen = document.createElement('div');
      aktionen.className = 'check__actions';

      var a1 = document.createElement('a');
      a1.className = 'btn btn--primary';
      a1.href = 'kontakt.html?score=' + wert;
      a1.textContent = 'Ergebnis besprechen';

      var a2 = document.createElement('button');
      a2.type = 'button';
      a2.className = 'btn btn--ghost';
      a2.textContent = 'Neu starten';
      a2.addEventListener('click', function () {
        index = 0;
        punkte = [];
        fortschritt(0);
        frage();
      });

      aktionen.append(a1, a2);
      wrap.appendChild(aktionen);
      stage.replaceChildren(wrap);
      fortschritt(CHECK.length);
    }

    fortschritt(0);
    frage();
  }

  /* ------------------------------------------- Aktuelle Seite markieren */

  function initCurrentPage() {
    var hier = location.pathname.split('/').pop() || 'index.html';
    Array.prototype.forEach.call(document.querySelectorAll('.mainnav__list a'), function (a) {
      var ziel = a.getAttribute('href').split('#')[0].split('/').pop();
      if (ziel && ziel === hier) {
        a.classList.add('is-current');
        a.setAttribute('aria-current', 'page');
      }
    });
  }

  /* --------------------------------- Ergebnis in das Kontaktformular tragen */

  function initScorePrefill() {
    var wert = new URLSearchParams(location.search).get('score');
    var feld = document.getElementById('f-text');
    if (!wert || !feld || feld.value) return;
    feld.value = 'Mein Sichtbarkeits-Check ergab ' + wert + ' von 100 Punkten. '
      + 'Ich würde das Ergebnis gern besprechen.\n\n';
  }

  function boot() {
    initStory();
    initNav();
    initReveal();
    initImageFallbacks();
    initForm();
    initCheck();
    initCurrentPage();
    initScorePrefill();
    initMisc();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
