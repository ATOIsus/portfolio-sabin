// Network effects for the site.
// 1. Background topology on every <canvas class="net-bg">
//    data-variant="light", "dark" or "auto" (follows the theme), data-seed fixes the layout.
// 2. Pointer layer on <canvas class="pointer-net">: the mouse becomes a device that links
//    to hidden nodes nearby, and taps or scrolls on a phone send out a ping ripple.
// 3. Light and dark theme toggle.
(function () {
  var root = document.documentElement;
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PALETTES = {
    light: {
      line: "rgba(27, 95, 209, 0.16)",
      node: "rgba(27, 95, 209, 0.42)",
      core: "#1b5fd1",
      packet: "#1b5fd1",
    },
    dark: {
      line: "rgba(141, 180, 255, 0.16)",
      node: "rgba(141, 180, 255, 0.5)",
      core: "#8db4ff",
      packet: "#d6e4ff",
    },
  };

  function currentTheme() {
    return root.dataset.theme === "dark" ? "dark" : "light";
  }

  function seeded(seed) {
    var s = seed;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  /* ---------------- Theme toggle ---------------- */

  var themeButton = document.querySelector(".theme-toggle");
  var themeMeta = document.querySelector('meta[name="theme-color"]');

  function applyTheme(theme, save) {
    root.dataset.theme = theme;
    if (save) {
      try {
        localStorage.setItem("theme", theme);
      } catch (e) {}
    }
    if (themeButton) {
      var dark = theme === "dark";
      themeButton.setAttribute("aria-pressed", dark ? "true" : "false");
      themeButton.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
      themeButton.title = dark ? "Switch to light mode" : "Switch to dark mode";
    }
    if (themeMeta) themeMeta.setAttribute("content", theme === "dark" ? "#0c1525" : "#f3f6fa");
    document.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  }

  applyTheme(currentTheme(), false);

  if (themeButton) {
    themeButton.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark", true);
    });
  }

  // Follow the device setting until the visitor picks a theme themselves
  var darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  var onDeviceChange = function (e) {
    var saved = null;
    try {
      saved = localStorage.getItem("theme");
    } catch (err) {}
    if (!saved) applyTheme(e.matches ? "dark" : "light", false);
  };
  if (darkQuery.addEventListener) darkQuery.addEventListener("change", onDeviceChange);

  /* ---------------- Background topology ---------------- */

  function setupTopology(canvas) {
    var ctx = canvas.getContext("2d");
    var variant = canvas.dataset.variant || "light";
    var seed = parseInt(canvas.dataset.seed, 10) || 7;
    var colors = PALETTES[variant === "auto" ? currentTheme() : variant] || PALETTES.light;
    var w = 0, h = 0, nodes = [], edges = [], packets = [];
    var raf = null, onScreen = true, resizeTimer;

    function randomPacket(r) {
      r = r || Math.random;
      var e = edges[Math.floor(r() * edges.length)];
      return { e: e, t: r(), speed: 0.003 + r() * 0.005, from: r() < 0.5 ? e.a : e.b };
    }

    function build() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      var r = seeded(seed);
      var spacing = w < 700 ? 88 : 118;
      nodes = [];
      for (var y = spacing / 2; y < h + spacing / 2; y += spacing) {
        for (var x = spacing / 2; x < w + spacing / 2; x += spacing) {
          if (r() < 0.32) continue;
          nodes.push({
            x: x + (r() - 0.5) * spacing * 0.75,
            y: y + (r() - 0.5) * spacing * 0.75,
            core: r() < 0.12,
          });
        }
      }

      edges = [];
      var seen = {};
      nodes.forEach(function (a, i) {
        nodes
          .map(function (b, j) { return { j: j, d: Math.hypot(a.x - b.x, a.y - b.y) }; })
          .filter(function (o) { return o.j !== i && o.d < spacing * 1.8; })
          .sort(function (p, q) { return p.d - q.d; })
          .slice(0, a.core ? 4 : 2)
          .forEach(function (o) {
            var key = i < o.j ? i + "-" + o.j : o.j + "-" + i;
            if (!seen[key]) {
              seen[key] = true;
              edges.push({ a: i, b: o.j });
            }
          });
      });

      var count = Math.max(4, Math.min(16, Math.floor(edges.length / 5)));
      packets = [];
      if (edges.length) for (var k = 0; k < count; k++) packets.push(randomPacket(r));
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);

      ctx.lineWidth = 1;
      ctx.strokeStyle = colors.line;
      ctx.beginPath();
      edges.forEach(function (e) {
        ctx.moveTo(nodes[e.a].x, nodes[e.a].y);
        ctx.lineTo(nodes[e.b].x, nodes[e.b].y);
      });
      ctx.stroke();

      nodes.forEach(function (n) {
        if (n.core) {
          ctx.strokeStyle = colors.core;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(n.x - 5, n.y - 5, 10, 10);
          ctx.fillStyle = colors.core;
          ctx.fillRect(n.x - 2, n.y - 2, 4, 4);
        } else {
          ctx.fillStyle = colors.node;
          ctx.beginPath();
          ctx.arc(n.x, n.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      ctx.fillStyle = colors.packet;
      packets.forEach(function (p) {
        var a = nodes[p.from];
        var b = nodes[p.from === p.e.a ? p.e.b : p.e.a];
        var x = a.x + (b.x - a.x) * p.t;
        var y = a.y + (b.y - a.y) * p.t;
        ctx.globalAlpha = 0.22;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.arc(x, y, 2.2, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    function step() {
      packets = packets.map(function (p) {
        var t = p.t + p.speed;
        if (t < 1) return { e: p.e, t: t, speed: p.speed, from: p.from };
        // Arrived: forward the packet onto another link from this node
        var at = p.from === p.e.a ? p.e.b : p.e.a;
        var next = edges.filter(function (e) { return e !== p.e && (e.a === at || e.b === at); });
        if (!next.length) return randomPacket();
        var e = next[Math.floor(Math.random() * next.length)];
        return { e: e, t: 0, speed: p.speed, from: at };
      });
      draw();
      raf = requestAnimationFrame(step);
    }

    function start() {
      if (!reduceMotion && onScreen && !document.hidden && raf === null) {
        raf = requestAnimationFrame(step);
      }
    }

    function stop() {
      if (raf !== null) cancelAnimationFrame(raf);
      raf = null;
    }

    build();
    draw();
    start();

    if (variant === "auto") {
      document.addEventListener("themechange", function (e) {
        colors = PALETTES[e.detail] || PALETTES.light;
        draw();
      });
    }

    new ResizeObserver(function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        draw();
      }, 120);
    }).observe(canvas);

    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      onScreen ? start() : stop();
    }).observe(canvas);

    document.addEventListener("visibilitychange", function () {
      document.hidden ? stop() : start();
    });
  }

  document.querySelectorAll("canvas.net-bg").forEach(setupTopology);

  /* ---------------- Pointer and touch layer ---------------- */

  function setupPointerLayer(canvas) {
    if (reduceMotion) return;

    var ctx = canvas.getContext("2d");
    var SPACING = 92;        // gap between hidden nodes
    var REACH = 150;         // how far the cursor can link to nodes
    var NEIGHBOUR = 120;     // links between revealed nodes
    var w = 0, h = 0, dpr = 1;
    var nodes = [];          // positions in page coordinates, so they scroll with the content
    var builtHeight = 0, builtWidth = 0;
    var cursor = null;       // { x, y } in viewport coordinates
    var lastMove = 0;
    var ripples = [];
    var packets = [];
    var raf = null;
    var lastPacket = 0;
    var lastTouchPing = 0;
    var rgb = "27, 95, 209";

    function readColour() {
      var v = getComputedStyle(root).getPropertyValue("--net-rgb").trim();
      if (v) rgb = v;
    }

    function rgba(a) {
      return "rgba(" + rgb + ", " + a.toFixed(3) + ")";
    }

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var pageH = document.documentElement.scrollHeight;
      if (pageH !== builtHeight || w !== builtWidth) buildNodes(pageH);
    }

    function buildNodes(pageH) {
      var r = seeded(99);
      nodes = [];
      for (var y = SPACING / 2; y < pageH; y += SPACING) {
        for (var x = SPACING / 2; x < w + SPACING / 2; x += SPACING) {
          if (r() < 0.25) continue;
          nodes.push({
            x: x + (r() - 0.5) * SPACING * 0.7,
            y: y + (r() - 0.5) * SPACING * 0.7,
            core: r() < 0.1,
            glow: 0,
          });
        }
      }
      builtHeight = pageH;
      builtWidth = w;
    }

    // Nodes currently on screen (with a margin), in viewport coordinates
    function visibleNodes() {
      var top = window.scrollY - 40;
      var bottom = window.scrollY + h + 40;
      var out = [];
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.y >= top && n.y <= bottom) out.push({ n: n, x: n.x, y: n.y - window.scrollY });
      }
      return out;
    }

    function wake() {
      if (raf === null && !document.hidden) raf = requestAnimationFrame(frame);
    }

    function frame(now) {
      raf = null;
      ctx.clearRect(0, 0, w, h);

      var vis = visibleNodes();
      var idle = now - lastMove;
      // Cursor network fades out after a moment of no movement
      var cursorStrength = cursor ? Math.max(0, 1 - Math.max(0, idle - 1200) / 600) : 0;
      var active = cursorStrength > 0 || ripples.length || packets.length;

      // Light up nodes near the cursor and inside ripple rings
      vis.forEach(function (v) {
        var target = 0;
        if (cursorStrength > 0) {
          var d = Math.hypot(v.x - cursor.x, v.y - cursor.y);
          if (d < REACH) target = (1 - d / REACH) * cursorStrength;
        }
        ripples.forEach(function (rp) {
          var d = Math.hypot(v.x - rp.x, v.y - rp.y);
          var band = Math.abs(d - rp.r);
          if (band < 26) target = Math.max(target, (1 - band / 26) * rp.life);
        });
        v.n.glow += (target - v.n.glow) * 0.18;
        if (v.n.glow > 0.01) active = true;
      });

      // Links between revealed nodes
      ctx.lineWidth = 1;
      for (var i = 0; i < vis.length; i++) {
        var a = vis[i];
        if (a.n.glow < 0.05) continue;
        for (var j = i + 1; j < vis.length; j++) {
          var b = vis[j];
          if (b.n.glow < 0.05) continue;
          var d = Math.hypot(a.x - b.x, a.y - b.y);
          if (d < NEIGHBOUR) {
            ctx.strokeStyle = rgba(Math.min(a.n.glow, b.n.glow) * 0.35);
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // Links from the cursor to nearby nodes
      var linked = [];
      if (cursor && cursorStrength > 0) {
        vis.forEach(function (v) {
          var d = Math.hypot(v.x - cursor.x, v.y - cursor.y);
          if (d < REACH) {
            linked.push(v);
            ctx.strokeStyle = rgba((1 - d / REACH) * 0.55 * cursorStrength);
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(cursor.x, cursor.y);
            ctx.lineTo(v.x, v.y);
            ctx.stroke();
          }
        });

        // Send a packet from the cursor to a nearby node every so often
        if (linked.length && now - lastPacket > 260 && idle < 1200) {
          var target = linked[Math.floor(Math.random() * linked.length)];
          packets.push({ x0: cursor.x, y0: cursor.y, node: target.n, t: 0 });
          lastPacket = now;
        }
      }

      // Nodes
      vis.forEach(function (v) {
        var g = v.n.glow;
        if (g < 0.02) return;
        if (v.n.core) {
          ctx.strokeStyle = rgba(g * 0.9);
          ctx.lineWidth = 1.5;
          ctx.strokeRect(v.x - 5, v.y - 5, 10, 10);
          ctx.fillStyle = rgba(g * 0.9);
          ctx.fillRect(v.x - 2, v.y - 2, 4, 4);
        } else {
          ctx.fillStyle = rgba(g * 0.8);
          ctx.beginPath();
          ctx.arc(v.x, v.y, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // The cursor itself, drawn as a small device
      if (cursor && cursorStrength > 0) {
        ctx.strokeStyle = rgba(0.7 * cursorStrength);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 7, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = rgba(0.85 * cursorStrength);
        ctx.beginPath();
        ctx.arc(cursor.x, cursor.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Packets travelling from the cursor out to nodes
      packets = packets.filter(function (p) {
        p.t += 0.045;
        if (p.t >= 1) {
          p.node.glow = Math.min(1, p.node.glow + 0.5);
          return false;
        }
        var nx = p.node.x;
        var ny = p.node.y - window.scrollY;
        var x = p.x0 + (nx - p.x0) * p.t;
        var y = p.y0 + (ny - p.y0) * p.t;
        ctx.fillStyle = rgba(0.25);
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = rgba(0.95);
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      // Ping ripples from taps, clicks and finger scrolling
      ripples = ripples.filter(function (rp) {
        rp.r += rp.speed;
        rp.life = Math.max(0, 1 - rp.r / rp.max);
        if (rp.life <= 0) return false;
        ctx.strokeStyle = rgba(0.45 * rp.life);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = rgba(0.6 * rp.life);
        ctx.beginPath();
        ctx.arc(rp.x, rp.y, 3, 0, Math.PI * 2);
        ctx.fill();
        return true;
      });

      if (active) raf = requestAnimationFrame(frame);
    }

    function ping(x, y, size) {
      ripples.push({ x: x, y: y, r: 4, speed: 3.2, max: size || 170, life: 1 });
      if (ripples.length > 6) ripples.shift();
      wake();
    }

    readColour();
    resize();

    window.addEventListener("resize", resize);
    new ResizeObserver(function () {
      var pageH = document.documentElement.scrollHeight;
      if (Math.abs(pageH - builtHeight) > 40) buildNodes(pageH);
    }).observe(document.body);

    // Mouse and pen: the cursor joins the network
    window.addEventListener("pointermove", function (e) {
      if (e.pointerType === "touch") return;
      cursor = { x: e.clientX, y: e.clientY };
      lastMove = performance.now();
      wake();
    }, { passive: true });

    document.addEventListener("pointerleave", function () {
      cursor = null;
    });

    window.addEventListener("scroll", function () {
      if (cursor) {
        lastMove = performance.now();
        wake();
      }
    }, { passive: true });

    // Click with a mouse, or tap on a phone: send a ping
    window.addEventListener("pointerdown", function (e) {
      ping(e.clientX, e.clientY, e.pointerType === "touch" ? 150 : 190);
    }, { passive: true });

    // Finger scrolling on a phone: small pings follow the finger
    window.addEventListener("touchmove", function (e) {
      var now = performance.now();
      if (now - lastTouchPing < 220 || !e.touches.length) return;
      lastTouchPing = now;
      ping(e.touches[0].clientX, e.touches[0].clientY, 110);
    }, { passive: true });

    document.addEventListener("themechange", function () {
      readColour();
      wake();
    });

    document.addEventListener("visibilitychange", function () {
      if (document.hidden && raf !== null) {
        cancelAnimationFrame(raf);
        raf = null;
      }
    });
  }

  var pointerCanvas = document.querySelector("canvas.pointer-net");
  if (pointerCanvas) setupPointerLayer(pointerCanvas);

  /* ---------------- Footer year ---------------- */

  var year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
})();
