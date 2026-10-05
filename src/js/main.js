/**
 * main.js — All UI interactions
 *
 *  1. Typewriter effect (hero)
 *  2. Navbar scroll state + active link tracking
 *  3. Smooth scroll for anchor links
 *  4. Scroll progress bar
 *  5. Pinned hero parallax (content glides over the hero)
 *  6. Profile photo 3D tilt (pointer-driven)
 *  7. Generic scroll reveal
 *  8. About stat counters
 *  9. Skill animations: staggered entrance, bar fill, counters
 * 10. Skill filter
 * 11. Contact form validation
 */

/* ══════════════════════════════════════════
   0. SHARED UTILITIES
   ══════════════════════════════════════════ */
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ══════════════════════════════════════════
   1. TYPEWRITER
   ══════════════════════════════════════════ */
(function initTypewriter() {
  const el = document.getElementById('typewriter');
  if (!el) return;

  const phrases = [
    'Muhamad Ilham Fathony Sulton',
    'a Python Dev',
    'a DB Architect',
    'a Web Creator',
  ];

  let pi = 0, ci = 0, deleting = false;

  function type() {
    const phrase = phrases[pi];

    if (deleting) {
      el.textContent = phrase.slice(0, --ci);
    } else {
      el.textContent = phrase.slice(0, ++ci);
    }

    let delay = deleting ? 55 : 95;

    if (!deleting && ci === phrase.length) {
      delay = 2200;
      deleting = true;
    } else if (deleting && ci === 0) {
      deleting = false;
      pi = (pi + 1) % phrases.length;
      delay = 350;
    }

    setTimeout(type, delay);
  }

  setTimeout(type, 1400);
})();


/* ══════════════════════════════════════════
   2. NAVBAR — scroll state & active links
   ══════════════════════════════════════════ */
(function initNavbar() {
  const nav      = document.getElementById('mainNav');
  const sections = [...document.querySelectorAll('section[id]')];
  const links    = [...document.querySelectorAll('.nav-apple-link')];
  if (!nav) return;

  function onScroll() {
    nav.classList.toggle('scrolled', window.scrollY > 60);

    let current = '';
    sections.forEach(s => {
      if (window.scrollY >= s.offsetTop - 140) current = s.id;
    });
    links.forEach(l => {
      l.classList.toggle('active', l.getAttribute('href') === `#${current}`);
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ══════════════════════════════════════════
   3. SMOOTH SCROLL (nav links + any #href)
   ══════════════════════════════════════════ */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth' });

    // Close mobile menu if open
    const menu = document.getElementById('navbarNav');
    if (menu && menu.classList.contains('show')) {
      document.querySelector('.navbar-toggler')?.click();
    }
  });
});


/* ══════════════════════════════════════════
   4. SCROLL PROGRESS BAR
   ═══════════════════════════════════════════ */
(function initScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;

  function onScroll() {
    const h = document.documentElement;
    const scrollable = h.scrollHeight - h.clientHeight;
    if (scrollable <= 0) return;
    const p = Math.min(1, Math.max(0, h.scrollTop / scrollable));
    bar.style.transform = `scaleX(${p})`;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();
})();


/* ══════════════════════════════════════════
   5. PINNED HERO PARALLAX
   Hero stays fixed; content glides over it.
   ══════════════════════════════════════════ */
(function initHeroParallax() {
  if (reduceMotion) return;

  const hero    = document.querySelector('.hero-container');
  const indicator = document.getElementById('scrollIndicator');
  if (!hero) return;

  function onScroll() {
    const vh = window.innerHeight;
    const p  = Math.min(1, Math.max(0, window.scrollY / vh));

    // Hero fades & scales down as you scroll through it
    hero.style.opacity = 1 - p * 1.1;
    hero.style.transform = `translateY(${p * -60}px) scale(${1 - p * 0.06})`;
    if (indicator) indicator.style.opacity = 1 - p * 1.6;
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


/* ══════════════════════════════════════════
   6. PROFILE PHOTO 3D TILT
   ══════════════════════════════════════════ */
(function initPhotoTilt() {
  if (reduceMotion || window.matchMedia('(hover: none)').matches) return;

  const stage = document.getElementById('photoStage');
  const frame = document.getElementById('photoFrame');
  if (!stage || !frame) return;

  const MAX = 9; // degrees

  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width  - 0.5;
    const y = (e.clientY - r.top)  / r.height - 0.5;
    frame.style.transform = `rotateY(${x * MAX * 2}deg) rotateX(${-y * MAX * 2}deg) translateZ(8px)`;
  });

  stage.addEventListener('pointerleave', () => {
    frame.style.transform = 'rotateY(0deg) rotateX(0deg) translateZ(0px)';
  });
})();


/* ══════════════════════════════════════════
   7. GENERIC SCROLL REVEAL
   ══════════════════════════════════════════ */
const revealObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('revealed');
      revealObs.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.reveal-item').forEach(el => revealObs.observe(el));


/* ══════════════════════════════════════════
   8. ABOUT STAT COUNTERS
   ══════════════════════════════════════════ */
(function initStatCounters() {
  const statEls = document.querySelectorAll('.counter-stat');
  if (!statEls.length) return;

  function animCount(el) {
    const target = parseInt(el.dataset.target, 10);
    let val = 0;
    const step  = Math.max(1, Math.floor(target / 40));
    const timer = setInterval(() => {
      val += step;
      if (val >= target) { val = target; clearInterval(timer); }
      el.textContent = val;
    }, 40);
  }

  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animCount(e.target);
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });

  statEls.forEach(el => obs.observe(el));
})();


/* ══════════════════════════════════════════
   9. SKILL ANIMATIONS
   ══════════════════════════════════════════ */
(function initSkillAnimations() {

  function animateCounter(el, target, duration = 1400) {
    let start  = 0;
    const step = 16;
    const inc  = target / (duration / step);

    const id = setInterval(() => {
      start += inc;
      if (start >= target) {
        start = target;
        clearInterval(id);
        el.closest('.skill-percent')?.classList.add('counter-done');
      }
      el.textContent = Math.round(start);
    }, step);
  }

  function animateCard(card, index) {
    const staggerMs = index * 80;

    setTimeout(() => {
      card.style.transitionDelay = '0ms';
      card.classList.add('visible');

      setTimeout(() => {
        const fill    = card.querySelector('.skill-bar-fill');
        const counter = card.querySelector('.counter');
        if (!fill) return;

        const target = parseInt(fill.dataset.width, 10);
        fill.style.width = target + '%';

        setTimeout(() => fill.classList.add('filled'), 1500);
        if (counter) animateCounter(counter, target, 1400);
      }, 250);
    }, staggerMs);
  }

  let visibleIndex = 0;

  const skillObs = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCard(entry.target, visibleIndex++);
        skillObs.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -30px 0px',
  });

  document.querySelectorAll('.skill-card').forEach(card => skillObs.observe(card));
})();


/* ══════════════════════════════════════════
   10. SKILL FILTER
   ══════════════════════════════════════════ */
(function initSkillFilter() {
  const btns = document.querySelectorAll('.filter-btn');
  const cols = document.querySelectorAll('.skill-col');
  if (!btns.length) return;

  btns.forEach(btn => {
    btn.addEventListener('click', () => {
      btns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.dataset.filter;

      cols.forEach((col, i) => {
        const cat   = col.dataset.category;
        const match = filter === 'all' || cat === filter;

        if (match) {
          col.classList.remove('hidden');
          col.style.transitionDelay = (i * 40) + 'ms';
        } else {
          col.classList.add('hidden');
          col.style.transitionDelay = '0ms';
        }
      });
    });
  });
})();


/* ══════════════════════════════════════════
   11. CONTACT FORM VALIDATION
   ══════════════════════════════════════════ */
(function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const btn = document.getElementById('sendBtn');

  function showError(input, msg) {
    input.classList.add('is-invalid');
    input.style.animation = 'shake-x 0.4s ease';
    setTimeout(() => { input.style.animation = ''; }, 400);

    let err = input.parentElement.querySelector('.field-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'field-error';
      input.parentElement.appendChild(err);
    }
    err.textContent = msg;
  }

  function clearError(input) {
    input.classList.remove('is-invalid');
    const err = input.parentElement.querySelector('.field-error');
    if (err) err.textContent = '';
  }

  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  form.addEventListener('submit', e => {
    e.preventDefault();

    const name    = form.querySelector('#cfName');
    const email   = form.querySelector('#cfEmail');
    const message = form.querySelector('#cfMessage');
    let valid = true;

    [name, email, message].forEach(clearError);

    if (!name.value.trim()) { showError(name, 'Nama tidak boleh kosong.'); valid = false; }
    if (!emailRe.test(email.value.trim())) { showError(email, 'Masukkan email yang valid.'); valid = false; }
    if (message.value.trim().length < 10) { showError(message, 'Pesan minimal 10 karakter.'); valid = false; }

    if (!valid) return;

    // Never embed the raw address in HTML; decode at send time only.
    // b64 of the contact address in docs/PROFILE.md
    const contactAddress = atob('bXVoYW1tYWRpbGhhbWZhdGhvbnlzdWx0b25AZ21haWwuY29t');

    const subject = form.querySelector('#cfSubject').value.trim()
      || `Pesan dari Portfolio — ${name.value.trim()}`;
    const body = [
      `Nama: ${name.value.trim()}`,
      `Email: ${email.value.trim()}`,
      '',
      message.value.trim(),
    ].join('\n');

    const original = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-check2-circle me-2"></i>Membuka aplikasi email...';

    // Open the user's mail client with the message prefilled.
    setTimeout(() => {
      const mailto = `mailto:${contactAddress}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      window.location.href = mailto;

      btn.disabled = false;
      btn.innerHTML = original;
      form.reset();
    }, 600);
  });
})();


/* ══════════════════════════════════════════
   12. FOOTER YEAR
   ══════════════════════════════════════════ */
(function initYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
