/* ==========================================================================
   Remodelaciones Los 2 Amigos L y J
   Interacciones y animaciones. Vanilla JS + GSAP/ScrollTrigger + Lenis.

   Capas de degradacion (el sitio siempre es usable):
   1. Sin JS            -> contenido completo y legible (el preloader se oculta via <noscript>).
   2. Sin GSAP (CDN)    -> contenido completo, menu, FAQ, formulario y videos funcionan.
   3. prefers-reduced-motion -> igual que (2): sin pins, sin scrub, sin autoplay.
   ========================================================================== */
(() => {
    'use strict';

    /* ---------- Configuracion y utilidades ---------- */
    const WA_NUMBER = '5215641499290';
    const $ = (sel, ctx = document) => ctx.querySelector(sel);
    const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
    const root = document.documentElement;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const hasGSAP = Boolean(window.gsap && window.ScrollTrigger);
    const motion = hasGSAP && !reduced;

    let lenis = null;

    root.classList.replace('no-js', 'js');
    if (motion) root.classList.add('js-motion');

    const navHeight = () => parseFloat(getComputedStyle(root).getPropertyValue('--nav-h')) || 64;
    const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

    /* ======================================================================
       1. PRELOADER: la burbuja del nivel busca el centro mientras cargan
          las fuentes, el poster del hero y la ventana. Luego las dos
          mitades (los 2 amigos) se abren.
       ====================================================================== */
    function initLoader() {
        return new Promise((resolve) => {
            const el = $('#loader');
            if (!el) { root.classList.remove('is-loading'); return resolve(); }

            const num = $('#ld-num');
            const bubble = $('#ld-bubble');
            const label = $('#ld-label');
            const tube = bubble ? bubble.parentElement : null;
            const reach = tube ? Math.max(20, tube.clientWidth / 2 - 22) : 100;
            const minDuration = reduced ? 450 : 2500;
            const maxDuration = 9000;
            const t0 = performance.now();

            // Tareas reales de carga
            const loadImage = (src) => new Promise((ok) => {
                const img = new Image();
                img.onload = img.onerror = ok;
                img.src = src;
            });
            const tasks = [
                document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve(),
                loadImage('media/poster/clip-pintura-pistola.jpg'),
                new Promise((ok) => (document.readyState === 'complete' ? ok() : window.addEventListener('load', ok, { once: true }))),
            ];
            let tasksDone = 0;
            tasks.forEach((t) => Promise.resolve(t).catch(() => {}).then(() => { tasksDone += 1; }));

            let shown = 0;
            let finished = false;

            const render = (p) => {
                const pct = Math.round(p * 100);
                if (num) num.textContent = String(pct).padStart(3, '0');
                if (bubble) {
                    // oscilacion amortiguada: la burbuja va y viene hasta quedar al centro
                    const x = -(1 - p) * reach * Math.cos(p * 11);
                    bubble.style.setProperty('--bx', x.toFixed(1) + 'px');
                }
                el.setAttribute('aria-valuenow', String(pct));
            };

            const finish = () => {
                if (finished) return;
                finished = true;
                render(1);
                el.classList.add('is-level');
                if (label) label.textContent = 'A nivel. Bienvenido';

                setTimeout(() => {
                    el.classList.add('is-done');
                    root.classList.remove('is-loading');
                    resolve(); // el hero arranca mientras las puertas se abren
                    setTimeout(() => el.classList.add('is-gone'), 1500);
                }, reduced ? 100 : 650);
            };

            const frame = (now) => {
                if (finished) return;
                const elapsed = now - t0;
                const timeP = clamp(elapsed / minDuration, 0, 1);
                const eased = 1 - Math.pow(1 - timeP, 2.2);
                const realP = tasksDone / tasks.length;
                const cap = realP >= 1 ? 1 : 0.2 + realP * 0.7; // no pasa de ~90% hasta que todo cargo
                const target = Math.min(eased, cap);
                shown += (target - shown) * 0.14;
                if (target >= 1 && 1 - shown < 0.004) shown = 1;
                render(shown);
                if (shown >= 1 || elapsed > maxDuration) return finish();
                requestAnimationFrame(frame);
            };
            requestAnimationFrame(frame);
        });
    }

    /* ======================================================================
       2. VIDEOS: carga diferida y pausa fuera de pantalla
       ====================================================================== */
    function initVideos() {
        const videos = $$('video[data-vsrc]');
        if (!videos.length) return;

        const attach = (v) => {
            if (v.dataset.ready) return;
            v.dataset.ready = '1';
            v.muted = true;
            v.src = v.dataset.vsrc;
        };

        // Con movimiento reducido solo se muestran los posters
        if (reduced || !('IntersectionObserver' in window)) return;

        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                const v = entry.target;
                if (entry.isIntersecting) {
                    attach(v);
                    const p = v.play();
                    if (p && p.catch) p.catch(() => {});
                } else {
                    v.pause();
                }
            });
        }, { rootMargin: '240px 0px', threshold: 0.01 });

        videos.forEach((v) => io.observe(v));
    }

    /* ======================================================================
       3. SCROLL SUAVE (Lenis) + puente con ScrollTrigger
       ====================================================================== */
    function initSmoothScroll() {
        if (!motion || typeof window.Lenis === 'undefined') return;
        lenis = new window.Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
        lenis.stop(); // se libera cuando termina el preloader
        lenis.on('scroll', window.ScrollTrigger.update);
        window.gsap.ticker.add((t) => lenis.raf(t * 1000));
        window.gsap.ticker.lagSmoothing(0);
    }

    function scrollToTarget(target, immediate) {
        if (lenis) {
            lenis.scrollTo(target, { offset: 0, duration: immediate ? 0 : 1.7, easing: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)) });
        } else {
            target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
        }
    }

    function initAnchors() {
        $$('a[href^="#"]').forEach((a) => {
            a.addEventListener('click', (e) => {
                const hash = a.getAttribute('href');
                if (!hash || hash === '#') return;
                const target = hash === '#inicio' ? document.body : $(hash);
                if (!target) return;
                e.preventDefault();
                closeMenu();
                if (hash === '#inicio') {
                    if (lenis) lenis.scrollTo(0, { duration: 1.6 });
                    else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
                } else {
                    // espera a que el menu cierre para evitar saltos
                    setTimeout(() => scrollToTarget(target), root.classList.contains('menu-open') ? 50 : 0);
                }
            });
        });
    }

    /* ======================================================================
       4. NAV, PROGRESO DE LECTURA Y MENU MOVIL
       ====================================================================== */
    const nav = $('#nav');
    const burger = $('#burger');
    const menu = $('#menu');

    function openMenu() {
        if (!menu || menu.classList.contains('is-open')) return;
        menu.classList.add('is-open');
        menu.removeAttribute('inert');
        menu.setAttribute('aria-hidden', 'false');
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Cerrar menú');
        root.classList.add('menu-open');
        if (lenis) lenis.stop();
    }

    function closeMenu() {
        if (!menu || !menu.classList.contains('is-open')) return;
        menu.classList.remove('is-open');
        menu.setAttribute('inert', '');
        menu.setAttribute('aria-hidden', 'true');
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Abrir menú');
        root.classList.remove('menu-open');
        if (lenis && !root.classList.contains('is-loading')) lenis.start();
    }

    function initNav() {
        if (burger) {
            burger.addEventListener('click', () => (menu.classList.contains('is-open') ? closeMenu() : openMenu()));
        }
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { closeMenu(); burger && burger.focus(); }
        });
        window.matchMedia('(min-width: 1024px)').addEventListener('change', (mq) => { if (mq.matches) closeMenu(); });

    }

    // Triggers de scroll del nav: se crean DESPUES de las escenas con pin para medir bien
    function initNavScroll() {
        const bar = $('#progress');

        if (hasGSAP) {
            const { ScrollTrigger } = window;
            ScrollTrigger.create({
                trigger: document.body, start: 'top -40', end: 'max',
                toggleClass: { targets: nav, className: 'is-stuck' }, refreshPriority: -1,
            });
            if (bar && !reduced) {
                ScrollTrigger.create({
                    start: 0, end: 'max',
                    onUpdate: (self) => { bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; }, refreshPriority: -1,
                });
            }
            // enlace activo segun la seccion visible
            $$('[data-nav]').forEach((link) => {
                const section = $('#' + link.dataset.nav);
                if (!section) return;
                ScrollTrigger.create({
                    trigger: section, start: 'top 55%', end: 'bottom 45%', refreshPriority: -1,
                    onToggle: (self) => link.classList.toggle('is-active', self.isActive),
                });
            });
        } else {
            // respaldo sin GSAP
            let ticking = false;
            window.addEventListener('scroll', () => {
                if (ticking) return;
                ticking = true;
                requestAnimationFrame(() => {
                    nav.classList.toggle('is-stuck', window.scrollY > 40);
                    if (bar) {
                        const max = document.documentElement.scrollHeight - window.innerHeight;
                        bar.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0).toFixed(4) + ')';
                    }
                    ticking = false;
                });
            }, { passive: true });
        }
    }

    /* ======================================================================
       5. HERO: confeti de colores, parallax con puntero y entrada
       ====================================================================== */
    function initHeroFX() {
        const canvas = $('#fx');
        const hero = $('.hero');
        if (!canvas || !hero) return;
        const ctx = canvas.getContext('2d');

        const copy = $('.hero__copy');
        let W = 0, H = 0, particles = [], safe = null, frame = 0;
        let raf = 0, visible = true;
        const pointer = { x: -9999, y: -9999 };
        const rnd = (a, b) => a + Math.random() * (b - a);

        // Colores de la paleta de pintura (r,g,b). La tinta va con poca opacidad.
        const COLORS = ['255,92,154', '76,201,240', '61,219,167', '255,255,255', '255,138,61', '27,18,9'];
        const make = () => {
            const c = COLORS[Math.floor(rnd(0, COLORS.length))];
            return {
                x: rnd(0, W), y: rnd(0, H),
                vx: rnd(-0.18, 0.18), vy: rnd(-0.5, -0.12),
                r: rnd(3, 7.5), a: rnd(0.6, 0.95), t: rnd(0, 6.28), spin: rnd(-0.025, 0.025),
                shape: Math.floor(rnd(0, 3)), // 0 circulo, 1 cuadrito, 2 cruz
                c, k: c === '27,18,9' ? 0.4 : 1,
            };
        };

        // Zona del texto: ahi el confeti se atenua para no estorbar la lectura
        const measure = () => {
            if (!copy) return;
            const c = copy.getBoundingClientRect(), r = canvas.getBoundingClientRect();
            safe = { x1: c.left - r.left - 12, y1: c.top - r.top - 12, x2: c.right - r.left + 12, y2: c.bottom - r.top + 12 };
        };

        const resize = () => {
            const rect = canvas.getBoundingClientRect();
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            W = rect.width; H = rect.height;
            canvas.width = Math.round(W * dpr);
            canvas.height = Math.round(H * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            const count = Math.round(clamp((W * H) / 20000, 20, 60));
            particles = Array.from({ length: count }, make);
            measure();
        };

        const draw = (animate) => {
            ctx.clearRect(0, 0, W, H);
            for (let i = 0; i < particles.length; i++) {
                const p = particles[i];
                if (animate) {
                    p.x += p.vx; p.y += p.vy; p.t += p.spin;
                    if (p.y < -12) { p.y = H + 12; p.x = rnd(0, W); }
                    if (p.x < -12) p.x = W + 12;
                    if (p.x > W + 12) p.x = -12;
                    const dx = p.x - pointer.x, dy = p.y - pointer.y;
                    const d2 = dx * dx + dy * dy;
                    if (d2 < 24000) { const f = (1 - d2 / 24000) * 1.8; p.x += (dx / Math.sqrt(d2 + 1)) * f; p.y += (dy / Math.sqrt(d2 + 1)) * f; }
                }
                const calm = safe && p.x > safe.x1 && p.x < safe.x2 && p.y > safe.y1 && p.y < safe.y2 ? 0.3 : 1;
                const col = 'rgba(' + p.c + ',' + (p.a * p.k * calm).toFixed(3) + ')';
                ctx.fillStyle = col;
                ctx.strokeStyle = col;
                if (p.shape === 0) {
                    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.2832); ctx.fill();
                } else {
                    ctx.save();
                    ctx.translate(p.x, p.y);
                    ctx.rotate(p.t * 8);
                    if (p.shape === 1) {
                        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
                    } else {
                        ctx.lineWidth = Math.max(2, p.r * 0.55);
                        ctx.lineCap = 'round';
                        ctx.beginPath();
                        ctx.moveTo(-p.r, 0); ctx.lineTo(p.r, 0);
                        ctx.moveTo(0, -p.r); ctx.lineTo(0, p.r);
                        ctx.stroke();
                    }
                    ctx.restore();
                }
            }
        };

        const loop = () => {
            if (!visible || document.hidden) { raf = 0; return; }
            if (++frame % 120 === 0) measure();
            draw(true);
            raf = requestAnimationFrame(loop);
        };
        const start = () => { if (!raf && !reduced) raf = requestAnimationFrame(loop); };

        resize();
        if (reduced) { draw(false); return; }

        if ('ResizeObserver' in window) new ResizeObserver(resize).observe(canvas);
        else window.addEventListener('resize', resize);

        if ('IntersectionObserver' in window) {
            new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) start(); }).observe(hero);
        }
        document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });

        if (finePointer) {
            hero.addEventListener('pointermove', (e) => {
                const r = canvas.getBoundingClientRect();
                pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top;
            });
            hero.addEventListener('pointerleave', () => { pointer.x = -9999; pointer.y = -9999; });
        }
        start();
    }

    function initHeroParallax() {
        const hero = $('.hero');
        const portal = $('#portal');
        if (!hero || !portal || !finePointer || reduced) return;
        const floats = $$('.float');
        if (!window.matchMedia('(min-width: 1024px)').matches) return;

        let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0;
        const tick = () => {
            cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
            portal.style.transform = 'rotateY(' + (cx * 9).toFixed(2) + 'deg) rotateX(' + (-cy * 7).toFixed(2) + 'deg)';
            if (floats[0]) floats[0].style.translate = (cx * -38).toFixed(1) + 'px ' + (cy * -26).toFixed(1) + 'px';
            if (floats[1]) floats[1].style.translate = (cx * 46).toFixed(1) + 'px ' + (cy * 30).toFixed(1) + 'px';
            if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) raf = requestAnimationFrame(tick);
            else raf = 0;
        };
        hero.addEventListener('pointermove', (e) => {
            const r = hero.getBoundingClientRect();
            tx = (e.clientX - r.left) / r.width - 0.5;
            ty = (e.clientY - r.top) / r.height - 0.5;
            if (!raf) raf = requestAnimationFrame(tick);
        });
        hero.addEventListener('pointerleave', () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); });
    }

    function heroIntro() {
        const { gsap } = window;
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
        tl.to('[data-hero="tag"]', { y: 0, autoAlpha: 1, duration: 1 }, 0.1)
            .to('[data-hero="line"]', { yPercent: 0, duration: 1.4, stagger: 0.13 }, 0.15)
            .to('[data-hero="fade"]', { y: 0, autoAlpha: 1, duration: 1.1, stagger: 0.14 }, 0.55)
            .to('.hero__media', { autoAlpha: 1, duration: 1.6, ease: 'power2.out' }, 0.2)
            .to('.portal', { clipPath: 'inset(-4% -4% -4% -4% round 28px)', duration: 1.7, ease: 'expo.inOut' }, 0.2)
            .to('.float', { autoAlpha: 1, clipPath: 'inset(-6% -6% -6% -6%)', duration: 1.3, stagger: 0.18, ease: 'power3.out' }, 1.0)
            .to('.badge', { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.3, ease: 'back.out(1.5)' }, 1.15)
            .to('.burst', { autoAlpha: 1, scale: 1, rotate: 0, duration: 1.3, ease: 'back.out(1.8)' }, 1.4)
            .to(nav, { yPercent: 0, autoAlpha: 1, duration: 1.1 }, 0.35)
            .add(() => { $('.hero').classList.add('is-live'); gsap.set(['.portal', '.float'], { clearProps: 'clipPath' }); }, 2.4);
        return tl;
    }

    function prepareHero() {
        const { gsap } = window;
        gsap.set('[data-hero="tag"]', { y: 20, autoAlpha: 0 });
        gsap.set('[data-hero="line"]', { yPercent: 118 });
        gsap.set('[data-hero="fade"]', { y: 30, autoAlpha: 0 });
        gsap.set('.hero__media', { autoAlpha: 0 });
        gsap.set('.portal', { clipPath: 'inset(100% -4% -4% -4% round 28px)' });
        gsap.set('.float', { autoAlpha: 0, clipPath: 'inset(100% -6% -6% -6%)' });
        gsap.set('.badge', { autoAlpha: 0, scale: 0.4, rotate: -90 });
        gsap.set('.burst', { autoAlpha: 0, scale: 0.3, rotate: -50 });
        gsap.set(nav, { yPercent: -100, autoAlpha: 0 });
    }

    /* ======================================================================
       6. MICRO-INTERACCIONES: magnetico y spotlight
       ====================================================================== */
    function initMagnetic() {
        if (!motion || !finePointer) return;
        const { gsap } = window;
        $$('[data-magnetic]').forEach((btn) => {
            const xTo = gsap.quickTo(btn, 'x', { duration: 0.7, ease: 'power3' });
            const yTo = gsap.quickTo(btn, 'y', { duration: 0.7, ease: 'power3' });
            btn.addEventListener('pointermove', (e) => {
                const r = btn.getBoundingClientRect();
                xTo((e.clientX - (r.left + r.width / 2)) * 0.28);
                yTo((e.clientY - (r.top + r.height / 2)) * 0.34);
            });
            btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
        });
    }

    function initSpotlight() {
        if (!finePointer) return;
        $$('.spot').forEach((el) => {
            let raf = 0;
            el.addEventListener('pointermove', (e) => {
                if (raf) return;
                raf = requestAnimationFrame(() => {
                    const r = el.getBoundingClientRect();
                    el.style.setProperty('--mx', (e.clientX - r.left).toFixed(0) + 'px');
                    el.style.setProperty('--my', (e.clientY - r.top).toFixed(0) + 'px');
                    raf = 0;
                });
            });
        });
    }

    /* ======================================================================
       7. TEXTO: separacion en palabras
       ====================================================================== */
    function splitMask(el) {
        const text = el.textContent.trim().replace(/\s+/g, ' ');
        el.textContent = '';
        const words = text.split(' ');
        const inners = [];
        words.forEach((w, i) => {
            const outer = document.createElement('span');
            outer.className = 'sw';
            const inner = document.createElement('span');
            inner.className = 'sw__i';
            inner.textContent = w;
            outer.appendChild(inner);
            el.appendChild(outer);
            if (i < words.length - 1) el.appendChild(document.createTextNode(' '));
            inners.push(inner);
        });
        return inners;
    }

    function splitWordsInPlace(el) {
        const out = [];
        const walk = (node) => {
            Array.from(node.childNodes).forEach((child) => {
                if (child.nodeType === 3) {
                    const parts = child.textContent.split(/(\s+)/);
                    const frag = document.createDocumentFragment();
                    parts.forEach((part) => {
                        if (!part) return;
                        if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
                        const s = document.createElement('span');
                        s.className = 'w';
                        s.textContent = part;
                        frag.appendChild(s);
                        out.push(s);
                    });
                    node.replaceChild(frag, child);
                } else if (child.nodeType === 1) {
                    walk(child);
                }
            });
        };
        walk(el);
        return out;
    }

    /* ======================================================================
       8. ESCENAS DE SCROLL (GSAP + ScrollTrigger)
       ====================================================================== */
    function initScenes() {
        const { gsap, ScrollTrigger } = window;
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });

        prepareHero();

        /* --- Titulos con mascara de palabras --- */
        $$('[data-split]').forEach((el) => {
            const words = splitMask(el);
            gsap.set(words, { yPercent: 118 });
            ScrollTrigger.create({
                trigger: el, start: 'top 88%', once: true,
                onEnter: () => gsap.to(words, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: 0.055 }),
            });
        });

        /* --- Aparicion generica por lotes --- */
        const reveals = $$('[data-reveal]');
        if (reveals.length) {
            gsap.set(reveals, { autoAlpha: 0, y: 38 });
            ScrollTrigger.batch(reveals, {
                start: 'top 90%', once: true,
                onEnter: (batch) => gsap.to(batch, {
                    autoAlpha: 1, y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.1,
                    onComplete: () => gsap.set(batch, { clearProps: 'transform,opacity,visibility' }),
                }),
            });
        }

        /* --- Hero: sale con parallax al hacer scroll --- */
        gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } })
            .to('.hero__copy', { yPercent: -14, autoAlpha: 0.1, ease: 'none' }, 0)
            .to('.hero__media', { yPercent: 9, ease: 'none' }, 0);

        /* --- Marquee reacciona a la velocidad del scroll --- */
        const track = $('.marquee__track');
        if (track) {
            const anims = $$('.marquee__group').map((g) => g.getAnimations()[0]).filter(Boolean);
            const skewTo = gsap.quickTo(track, 'skewX', { duration: 0.7, ease: 'power3' });
            let rate = 1, dir = 1, vel = 0;
            if (lenis) lenis.on('scroll', (e) => { vel = e.velocity || 0; });
            gsap.ticker.add(() => {
                if (Math.abs(vel) > 1.5) dir = vel < 0 ? -1 : 1;
                rate += ((1 + Math.min(Math.abs(vel) * 0.45, 7)) - rate) * 0.08;
                vel *= 0.92;
                anims.forEach((a) => { a.playbackRate = rate * dir; });
                skewTo(clamp(-vel * 0.5, -9, 9));
            });
        }

        /* --- Manifiesto: las palabras se encienden con el scroll --- */
        const manifesto = $('[data-words]');
        if (manifesto) {
            const words = splitWordsInPlace(manifesto);
            gsap.to(words, {
                opacity: 1, ease: 'none', stagger: 0.12, duration: 0.5,
                scrollTrigger: { trigger: manifesto, start: 'top 82%', end: 'bottom 50%', scrub: 0.5 },
            });
        }

        /* --- Contadores --- */
        $$('[data-count]').forEach((el) => {
            const end = parseInt(el.dataset.count, 10);
            const o = { v: 0 };
            el.textContent = '0';
            ScrollTrigger.create({
                trigger: el, start: 'top 92%', once: true,
                onEnter: () => gsap.to(o, {
                    v: end, duration: 2, ease: 'power3.out',
                    onUpdate: () => { el.textContent = String(Math.round(o.v)); },
                }),
            });
        });

        const mm = gsap.matchMedia();

        /* --- Expand: la ventana de obra real se abre con el scroll --- */
        mm.add({ desktop: '(min-width: 768px)', mobile: '(max-width: 767px)' }, (ctx) => {
            const { desktop } = ctx.conditions;
            const section = $('.expand');
            const win = $('#ex-window');
            const caption = $('#ex-caption');
            if (!section || !win) return;
            const titleL = $('[data-ex="l"]');
            const titleR = $('[data-ex="r"]');
            const panels = $$('.expand__panel', win);
            const videos = $$('.expand__video', win);
            const sides = panels.filter((p) => !p.classList.contains('is-center'));

            gsap.set(win, desktop ? { '--ct': 21, '--cr': 40, '--cb': 21, '--cl': 40, '--cd': 28 } : { '--ct': 21, '--cr': 13, '--cb': 23, '--cl': 13, '--cd': 28 });
            gsap.set(caption, { autoAlpha: 0, y: 50 });

            const tl = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: { trigger: section, start: 'top top', end: '+=180%', pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true },
            });
            tl.to(win, { '--ct': 0, '--cr': 0, '--cb': 0, '--cl': 0, '--cd': 0, duration: 1 }, 0)
                .fromTo(videos, { scale: 1.4 }, { scale: 1, duration: 1 }, 0);
            if (desktop) {
                tl.to(titleL, { x: '-34vw', autoAlpha: 0, duration: 0.8 }, 0)
                    .to(titleR, { x: '34vw', autoAlpha: 0, duration: 0.8 }, 0)
                    .fromTo(sides, { yPercent: (i) => (i % 2 ? 12 : -12) }, { yPercent: 0, duration: 1 }, 0);
            } else {
                tl.to(titleL, { y: '-30vh', autoAlpha: 0, duration: 0.8 }, 0)
                    .to(titleR, { y: '30vh', autoAlpha: 0, duration: 0.8 }, 0);
            }
            tl.to(caption, { autoAlpha: 1, y: 0, ease: 'power2.out', duration: 0.3 }, 0.9)
                .to({}, { duration: 0.25 }); // pausa final con la ventana abierta
        });

        /* --- Servicios: pila de tarjetas sticky --- */
        const cards = $$('.svc');
        cards.forEach((card, i) => {
            const dim = document.createElement('i');
            dim.className = 'svc__dim';
            dim.setAttribute('aria-hidden', 'true');
            card.appendChild(dim);
            if (i === cards.length - 1) return;
            const next = cards[i + 1];
            gsap.timeline({
                scrollTrigger: {
                    trigger: next, start: 'top bottom',
                    end: () => 'top ' + (parseFloat(getComputedStyle(next).top) || 0) + 'px',
                    scrub: true,
                },
            })
                .to(card, { scale: 0.93, ease: 'none' }, 0)
                .to(dim, { opacity: 0.6, ease: 'none' }, 0);
        });

        /* --- Obras: pan horizontal en escritorio, scroll nativo en movil --- */
        mm.add('(min-width: 1024px)', () => {
            const work = $('.work');
            const trackEl = $('#work-track');
            const bar = $('#work-bar');
            if (!work || !trackEl) return;
            work.classList.add('is-pan');
            const distance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);

            const pan = gsap.to(trackEl, {
                x: () => -distance(), ease: 'none',
                scrollTrigger: {
                    trigger: work, start: 'top top', end: () => '+=' + distance(),
                    pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true,
                    onUpdate: (self) => { if (bar) bar.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; },
                },
            });
            $$('.wcard__img img', trackEl).forEach((img) => {
                gsap.fromTo(img, { xPercent: -9 }, {
                    xPercent: 9, ease: 'none',
                    scrollTrigger: { trigger: img.closest('.wcard'), containerAnimation: pan, start: 'left right', end: 'right left', scrub: true },
                });
            });
            return () => work.classList.remove('is-pan');
        });

        /* --- Proceso: la linea se dibuja y los nodos se encienden --- */
        const rail = $('#rail');
        if (rail) {
            const steps = $$('.pstep', rail);
            gsap.set(rail, { '--p': 0 });
            gsap.to(rail, {
                '--p': 1, ease: 'none',
                scrollTrigger: {
                    trigger: $('.process__list', rail), start: 'top 72%', end: 'bottom 55%', scrub: 0.5,
                    onUpdate: (self) => {
                        steps.forEach((s, i) => s.classList.toggle('is-on', self.progress >= (i / steps.length) * 0.92 + 0.02));
                    },
                },
            });
        }

        /* --- Parallax suave en imagenes marcadas (bento) --- */
        $$('.bcell img[data-px]').forEach((img) => {
            gsap.fromTo(img, { yPercent: -7 }, {
                yPercent: 7, ease: 'none',
                scrollTrigger: { trigger: img.closest('.bcell'), start: 'top bottom', end: 'bottom top', scrub: true },
            });
        });
        if (!window.matchMedia('(min-width: 1024px)').matches) {
            $$('.wcard__img img').forEach((img) => {
                gsap.fromTo(img, { yPercent: -6 }, {
                    yPercent: 6, ease: 'none',
                    scrollTrigger: { trigger: img.closest('.wcard'), start: 'top bottom', end: 'bottom top', scrub: true },
                });
            });
        }

        /* --- Footer: la palabra gigante se llena de color --- */
        const word = $('.footer__word');
        if (word) {
            word.dataset.text = word.textContent.trim();
            gsap.fromTo(word, { '--cut': '100%' }, {
                '--cut': '0%', ease: 'none',
                scrollTrigger: { trigger: word, start: 'top 98%', end: 'top 42%', scrub: 0.6 },
            });
        }
    }

    /* ======================================================================
       9. BENTO: nivel de burbuja interactivo
       ====================================================================== */
    function initSpirit() {
        const cell = $('.bcell--d');
        const spirit = $('#spirit');
        const bubble = $('#spirit-bubble');
        if (!cell || !spirit || !bubble) return;

        const tube = bubble.parentElement;
        let target = 0, current = 0, raf = 0, hovering = false;
        const reach = () => tube.clientWidth / 2 - 30;

        const apply = () => {
            bubble.style.setProperty('--bx', current.toFixed(1) + 'px');
            spirit.classList.toggle('is-level', Math.abs(current) < 6);
        };
        const tick = () => {
            current += (target - current) * 0.12;
            apply();
            if (Math.abs(target - current) > 0.2) raf = requestAnimationFrame(tick);
            else { current = target; apply(); raf = 0; }
        };
        const go = () => { if (!raf) raf = requestAnimationFrame(tick); };

        // al entrar a pantalla la burbuja busca el nivel con rebote
        if (motion) {
            const { gsap, ScrollTrigger } = window;
            const o = { x: -reach() * 0.9 };
            ScrollTrigger.create({
                trigger: cell, start: 'top 80%', once: true,
                onEnter: () => gsap.to(o, {
                    x: 0, duration: 2.6, ease: 'elastic.out(1, 0.32)',
                    onUpdate: () => { if (!hovering) { current = target = o.x; apply(); } },
                }),
            });
            current = target = o.x; apply();
        }

        if (finePointer) {
            cell.addEventListener('pointermove', (e) => {
                hovering = true;
                const r = tube.getBoundingClientRect();
                const ratio = clamp((e.clientX - r.left) / r.width, 0, 1) * 2 - 1;
                target = ratio * reach();
                go();
            });
            cell.addEventListener('pointerleave', () => { hovering = false; target = 0; go(); });
        }
    }

    /* ======================================================================
       10. FAQ
       ====================================================================== */
    function initFAQ() {
        const items = $$('.qa');
        let refreshTimer = 0;
        items.forEach((qa, idx) => {
            const btn = $('.qa__q', qa);
            const open = (state) => {
                qa.classList.toggle('is-open', state);
                btn.setAttribute('aria-expanded', String(state));
            };
            if (idx === 0) open(true);
            btn.addEventListener('click', () => {
                open(!qa.classList.contains('is-open'));
                if (hasGSAP) {
                    clearTimeout(refreshTimer);
                    refreshTimer = setTimeout(() => window.ScrollTrigger.refresh(), 650);
                }
            });
        });
    }

    /* ======================================================================
       11. FORMULARIO -> WHATSAPP
       ====================================================================== */
    function initForm() {
        const form = $('#wa-form');
        if (!form) return;
        const name = $('#f-name');
        const type = $('#f-type');
        const btn = $('#f-submit');
        const label = $('.btn__label', btn);
        const status = $('#f-status');
        const baseLabel = label.textContent;

        const setError = (input, msg) => {
            const field = input.closest('.field');
            const out = $('#' + input.id + '-err');
            field.classList.toggle('is-err', Boolean(msg));
            input.setAttribute('aria-invalid', msg ? 'true' : 'false');
            if (out) out.textContent = msg || '';
        };
        [name, type].forEach((input) => {
            input.addEventListener('input', () => setError(input, ''));
            input.addEventListener('change', () => setError(input, ''));
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            status.textContent = '';
            status.classList.remove('is-ok');

            const nameVal = name.value.trim();
            const typeVal = type.value;
            setError(name, nameVal ? '' : 'Escribe tu nombre para saber con quién hablamos.');
            setError(type, typeVal ? '' : 'Elige qué tipo de trabajo necesitas.');
            if (!nameVal) return name.focus();
            if (!typeVal) return type.focus();

            const tel = $('#f-tel').value.trim();
            const zone = $('#f-zone').value.trim();
            const msg = $('#f-msg').value.trim();
            const lines = [
                'Hola, soy ' + nameVal + '.',
                'Quiero cotizar: ' + typeVal + '.',
            ];
            if (zone) lines.push('Zona: ' + zone + '.');
            if (msg) lines.push('Detalles: ' + msg);
            if (tel) lines.push('Mi teléfono: ' + tel);
            lines.push('(Mensaje enviado desde el sitio web)');
            const url = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(lines.join('\n'));

            btn.disabled = true;
            label.textContent = 'Abriendo WhatsApp...';
            const w = window.open(url, '_blank');
            if (w) w.opener = null;

            status.classList.add('is-ok');
            status.innerHTML = w
                ? 'Listo, te esperamos en WhatsApp para revisar tu proyecto.'
                : 'Si no se abrió WhatsApp, <a href="' + url + '" target="_blank" rel="noopener">toca aquí para enviarlo</a>.';
            setTimeout(() => { btn.disabled = false; label.textContent = baseLabel; }, 3200);
        });
    }

    /* ======================================================================
       12. BOTON FLOTANTE
       ====================================================================== */
    function initFab() {
        const fab = $('#fab');
        if (!fab) return;
        setTimeout(() => fab.classList.add('is-in'), 400);
        setTimeout(() => fab.classList.add('show-tip'), 4200);
        setTimeout(() => fab.classList.remove('show-tip'), 9500);
    }

    /* ======================================================================
       ARRANQUE
       ====================================================================== */
    function init() {
        const year = $('#year');
        if (year) year.textContent = String(new Date().getFullYear());

        const loaded = initLoader();

        initSmoothScroll();
        initNav();
        initAnchors();
        initFAQ();
        initForm();
        initVideos();
        initHeroFX();
        initHeroParallax();
        initSpotlight();
        initMagnetic();
        if (hasGSAP && !reduced) initScenes();
        initNavScroll();
        initSpirit();

        loaded.then(() => {
            if (hasGSAP) window.ScrollTrigger.refresh();
            if (lenis) lenis.start();
            if (motion) heroIntro();
            initFab();
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
