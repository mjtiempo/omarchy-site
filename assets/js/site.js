    const launcher  = document.getElementById("launcher");
    const logo      = document.getElementById("logo");
    const scrim     = document.getElementById("scrim");
    const search    = document.getElementById("search");
    const list      = document.getElementById("list");
    const empty     = document.getElementById("empty");
    const links     = Array.from(list.querySelectorAll(".link"));

    /* ── Themes — one built-in Omarchy theme per workspace ───────── */

    const workspaces = Array.from(document.querySelectorAll(".workspace"));

    function setTheme(n) {
      document.body.dataset.theme = String(n);
      for (const ws of workspaces) {
        const isActive = Number(ws.dataset.theme) === n;
        ws.classList.toggle("active", isActive);
        ws.setAttribute("aria-current", isActive ? "true" : "false");
      }
      try { localStorage.setItem("omarchy-theme", String(n)); } catch {}
      if (n !== 2) resetVideos(); // videos belong to workspace 2; stop playback elsewhere
    }

    for (const ws of workspaces) {
      ws.addEventListener("click", () => { setTheme(Number(ws.dataset.theme)); syncAboutWindow(); });
    }

    let savedTheme = 1;
    try { savedTheme = Number(localStorage.getItem("omarchy-theme")) || 1; } catch {}
    const urlTheme = Number(new URLSearchParams(location.search).get("theme"));
    if (urlTheme) savedTheme = urlTheme;
    setTheme(savedTheme >= 1 && savedTheme <= 9 ? savedTheme : 1);

    function visibleLinks() {
      return links.filter((link) => !link.classList.contains("hidden"));
    }

    function setSelected(index) {
      const visible = visibleLinks();
      visible.forEach((link) => link.classList.remove("selected"));
      if (!visible.length) return;
      const clamped = ((index % visible.length) + visible.length) % visible.length;
      visible[clamped].classList.add("selected");
      visible[clamped].scrollIntoView({ block: "nearest" });
    }

    function open() {
      launcher.classList.add("open");
      logo.setAttribute("aria-expanded", "true");
      search.value = "";
      filter();
      setSelected(0);
      search.focus();
      document.body.style.overflow = "hidden";
    }

    function close() {
      launcher.classList.remove("open");
      logo.setAttribute("aria-expanded", "false");
      document.body.style.overflow = "";
      logo.focus();
    }

    function filter() {
      const query = search.value.trim().toLowerCase();
      let count = 0;
      for (const link of links) {
        const match = !query || link.dataset.search.toLowerCase().includes(query);
        link.classList.toggle("hidden", !match);
        if (match) count++;
      }
      empty.classList.toggle("visible", count === 0);
      return count;
    }

    function currentIndex() {
      const visible = visibleLinks();
      return visible.findIndex((link) => link.classList.contains("selected"));
    }

    logo.addEventListener("click", () =>
      launcher.classList.contains("open") ? close() : open()
    );

    scrim.addEventListener("click", close);

    search.addEventListener("input", () => {
      filter();
      setSelected(0);
    });

    /* ── Clock ────────────────────────────────────────────────── */

    const MONTHS_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const MONTHS_SHORT = MONTHS_FULL.map(m => m.slice(0, 3));
    const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const DAYS_SHORT = DAYS_FULL.map(d => d.slice(0, 3));
    const CLOCK_FORMATS = ["dddd HH:mm", "dddd h:mm AP", "dddd HH:mm:ss", "dddd h:mm:ss AP", "HH:mm", "h:mm AP", "ddd d MMM HH:mm", "ddd d MMM h:mm AP", "d MMMM 'W'ww yyyy", "yyyy-MM-dd HH:mm"];

    function pad2(n) { return (n < 10 ? "0" : "") + n; }

    // ISO-8601 week number (from the shell's clock Model.js)
    function isoWeek(year, month, day) {
      const date = new Date(Date.UTC(year, month, day));
      const weekday = date.getUTCDay() || 7;
      date.setUTCDate(date.getUTCDate() + 4 - weekday);
      const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
    }

    function todayISO() { return dateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()); }
    function dateKey(y, m, d) { return y + "-" + pad2(m + 1) + "-" + pad2(d); }

    // Qt format tokens, per the shell's clock widget
    let clockFormat = "dddd HH:mm";
    try { clockFormat = localStorage.getItem("omarchy-clock-format") || clockFormat; } catch {}

    function formatClock(date, format) {
      return String(format).replace(/'([^']*)'|(dddd|ddd|MMMM|MMM|yyyy|ww|HH|hh|mm|ss|AP|h|d)/g, (m, lit, tok) => {
        if (lit !== undefined) return lit;
        switch (tok) {
          case "dddd": return DAYS_FULL[date.getDay()];
          case "ddd":  return DAYS_SHORT[date.getDay()];
          case "MMMM": return MONTHS_FULL[date.getMonth()];
          case "MMM":  return MONTHS_SHORT[date.getMonth()];
          case "yyyy": return String(date.getFullYear());
          case "ww":   return pad2(isoWeek(date.getFullYear(), date.getMonth(), date.getDate()));
          case "HH":   return pad2(date.getHours());
          case "hh":   return pad2(date.getHours() % 12 || 12);
          case "mm":   return pad2(date.getMinutes());
          case "ss":   return pad2(date.getSeconds());
          case "AP":   return date.getHours() < 12 ? "AM" : "PM";
          case "h":    return String(date.getHours() % 12 || 12);
          case "d":    return String(date.getDate());
          default: return m;
        }
      });
    }

    const clockBtn = document.getElementById("clockBtn");

    function renderClock() {
      clockBtn.textContent = formatClock(new Date(), clockFormat);
    }

    setInterval(() => {
      const text = formatClock(new Date(), clockFormat);
      if (text !== clockBtn.textContent) clockBtn.textContent = text;
    }, 1000);

    renderClock();

    // Right-click walks the format ring, like the shell's cycleFormat()
    clockBtn.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      const index = CLOCK_FORMATS.indexOf(clockFormat);
      clockFormat = CLOCK_FORMATS[(index + 1) % CLOCK_FORMATS.length];
      try { localStorage.setItem("omarchy-clock-format", clockFormat); } catch {}
      renderClock();
    });

    /* ── Calendar panel ───────────────────────────────────────── */

    const calPanel = document.getElementById("calPanel");
    const calHero = document.getElementById("calHero");
    const calHeroDate = document.getElementById("calHeroDate");
    const calYear = document.getElementById("calYear");
    const calYearFill = document.getElementById("calYearFill");
    const calYearPct = document.getElementById("calYearPct");
    const calGrid = document.getElementById("calGrid");
    const calMonthLabel = document.getElementById("calMonthLabel");

    function localeFirstDay() {
      try {
        const info = new Intl.Locale(navigator.language).weekInfo;
        if (info && info.firstDay) return info.firstDay % 7;
      } catch {}
      return 0;
    }

    let weekStart = 0;
    try { weekStart = Number(localStorage.getItem("omarchy-week-start")); } catch {}
    if (Number.isNaN(weekStart) || weekStart < 0 || weekStart > 6) weekStart = localeFirstDay();

    function calToday() { return new Date(); }
    let viewYear = calToday().getFullYear();
    let viewMonth = calToday().getMonth();

    function monthGrid(year, month, start) {
      const leading = (new Date(year, month, 1).getDay() - start + 7) % 7;
      const cursor = new Date(year, month, 1 - leading);
      const todayKey = todayISO();
      const weeks = [];
      for (let w = 0; w < 6; w++) {
        const days = [];
        let thursday = null;
        for (let d = 0; d < 7; d++) {
          const key = dateKey(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
          if (cursor.getDay() === 4) thursday = { year: cursor.getFullYear(), month: cursor.getMonth(), day: cursor.getDate() };
          days.push({ key, year: cursor.getFullYear(), month: cursor.getMonth(), day: cursor.getDate(), inMonth: cursor.getMonth() === month && cursor.getFullYear() === year, weekend: cursor.getDay() === 0 || cursor.getDay() === 6, today: key === todayKey });
          cursor.setDate(cursor.getDate() + 1);
        }
        const anchor = thursday || days[0];
        weeks.push({ week: isoWeek(anchor.year, anchor.month, anchor.day), days });
      }
      return weeks;
    }

    function yearProgressPercent() {
      const now = calToday();
      const start = Date.UTC(now.getFullYear(), 0, 1);
      const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
      const daysInYear = Math.round((Date.UTC(now.getFullYear() + 1, 0, 1) - start) / 86400000);
      const done = Math.round((today - start) / 86400000);
      return Math.max(0, Math.min(100, Math.round((done / daysInYear) * 100)));
    }

    function renderCal() {
      const now = calToday();
      const viewingCurrent = viewYear === now.getFullYear() && viewMonth === now.getMonth();

      calHeroDate.textContent = MONTHS_FULL[now.getMonth()] + " " + now.getDate();
      calHero.classList.toggle("clickable", !viewingCurrent);
      calHero.title = viewingCurrent ? "" : "Back to today";

      const pct = yearProgressPercent();
      calYear.textContent = String(now.getFullYear());
      calYearPct.textContent = pct + "%";
      calYearFill.style.width = pct + "%";

      const order = [];
      for (let i = 0; i < 7; i++) order.push((weekStart + i) % 7);

      calGrid.replaceChildren();
      const headerRow = el("div", "cal-week-row");
      const head = el("span", "cal-week-num w-head", "W");
      head.title = "Start weeks on " + (weekStart === 1 ? "Sunday" : "Monday");
      head.addEventListener("click", () => {
        weekStart = weekStart === 1 ? 0 : 1;
        try { localStorage.setItem("omarchy-week-start", String(weekStart)); } catch {}
        renderCal();
      });
      headerRow.appendChild(head);
      for (const d of order) headerRow.appendChild(el("span", "cal-day-hdr", DAYS_SHORT[d].toUpperCase()));
      calGrid.appendChild(headerRow);

      for (const week of monthGrid(viewYear, viewMonth, weekStart)) {
        const row = el("div", "cal-week-row");
        row.appendChild(el("span", "cal-week-num", String(week.week)));
        for (const day of week.days) {
          const cls = "cal-cell" + (day.today ? " today" : "") + (day.weekend ? " weekend" : "") + (day.inMonth ? "" : " out");
          row.appendChild(el("span", cls, String(day.day)));
        }
        calGrid.appendChild(row);
      }

      calMonthLabel.textContent = (MONTHS_FULL[viewMonth] + " " + viewYear).toUpperCase();
    }

    function moveMonth(delta) {
      const target = new Date(viewYear, viewMonth + delta, 1);
      viewYear = target.getFullYear();
      viewMonth = target.getMonth();
      renderCal();
    }

    function goToToday() {
      viewYear = calToday().getFullYear();
      viewMonth = calToday().getMonth();
      renderCal();
    }

    document.getElementById("calPrev").addEventListener("click", () => moveMonth(-1));
    document.getElementById("calNext").addEventListener("click", () => moveMonth(1));
    calHero.addEventListener("click", () => { if (!calHero.classList.contains("clickable")) return; goToToday(); });
    calPanel.addEventListener("wheel", (event) => {
      if (event.deltaY === 0) return;
      moveMonth(event.deltaY > 0 ? 1 : -1);
    }, { passive: true });

    /* ── Weather ──────────────────────────────────────────────── */

    const SVG_NS = "http://www.w3.org/2000/svg";

    function svgNode(parts) {
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", "0 0 24 24");
      for (const part of parts) {
        const el = document.createElementNS(SVG_NS, part.tag);
        for (const key of Object.keys(part.attrs || {})) el.setAttribute(key, part.attrs[key]);
        svg.appendChild(el);
      }
      return svg;
    }

    const stroke = { stroke: "currentColor", "stroke-width": "1.6", "stroke-linecap": "round", fill: "none" };
    const WX_ICON_PARTS = {
      sun: [{ tag: "circle", attrs: { cx: "12", cy: "12", r: "4" } }, { tag: "path", attrs: { d: "M12 2v2.4M12 19.6V22M2 12h2.4M19.6 12H22M4.9 4.9l1.7 1.7M17.4 17.4l1.7 1.7M19.1 4.9l-1.7 1.7M6.6 17.4l-1.7 1.7", ...stroke, "stroke-width": "1.8" } }],
      moon: [{ tag: "path", attrs: { d: "M20.6 13.4A8.8 8.8 0 1 1 10.6 3.4a7 7 0 0 0 10 10z" } }],
      sunCloud: [{ tag: "circle", attrs: { cx: "7.5", cy: "6.5", r: "2.8" } }, { tag: "path", attrs: { d: "M8.5 17.5a4 4 0 0 1-.6-7.9 5.8 5.8 0 0 1 10.7 1.3 3.4 3.4 0 0 1-.5 6.6z" } }],
      moonCloud: [{ tag: "path", attrs: { d: "M8.5 17.5a4 4 0 0 1-.6-7.9 5.8 5.8 0 0 1 10.7 1.3 3.4 3.4 0 0 1-.5 6.6z" } }, { tag: "path", attrs: { d: "M15.6 2.4a4 4 0 0 1-3.2 5.1 4.2 4.2 0 0 0 6.5 1.8 4.1 4.1 0 0 1-3.3-6.9z" } }],
      cloud: [{ tag: "path", attrs: { d: "M6.6 17.8a4.6 4.6 0 0 1-.7-9.2 6.4 6.4 0 0 1 12.6 1.5 3.9 3.9 0 0 1-.5 7.7z" } }],
      fog: [{ tag: "path", attrs: { d: "M6.6 15.5a4.6 4.6 0 0 1-.7-9.2 6.4 6.4 0 0 1 12.6 1.5 3.9 3.9 0 0 1-.5 7.7z" } }, { tag: "path", attrs: { d: "M4.5 19h15M6.5 21.5h11", ...stroke } }],
      drizzle: [{ tag: "path", attrs: { d: "M6.6 16.5a4.6 4.6 0 0 1-.7-9.2 6.4 6.4 0 0 1 12.6 1.5 3.9 3.9 0 0 1-.5 7.7z" } }, { tag: "path", attrs: { d: "M9 19.5v2M15 19.5v2", ...stroke } }],
      rain: [{ tag: "path", attrs: { d: "M6.6 16.5a4.6 4.6 0 0 1-.7-9.2 6.4 6.4 0 0 1 12.6 1.5 3.9 3.9 0 0 1-.5 7.7z" } }, { tag: "path", attrs: { d: "M7.8 19.5l-.6 2.2M12 19.5l-.6 2.2M16.2 19.5l-.6 2.2", ...stroke } }],
      snow: [{ tag: "path", attrs: { d: "M6.6 15.5a4.6 4.6 0 0 1-.7-9.2 6.4 6.4 0 0 1 12.6 1.5 3.9 3.9 0 0 1-.5 7.7z" } }, { tag: "path", attrs: { d: "M9 19.3v2M8 20.3h2M13 19.3v2M12 20.3h2M16.5 19.3v2M15.5 20.3h2", ...stroke, "stroke-width": "1.4" } }],
      sleet: [{ tag: "path", attrs: { d: "M6.6 16.5a4.6 4.6 0 0 1-.7-9.2 6.4 6.4 0 0 1 12.6 1.5 3.9 3.9 0 0 1-.5 7.7z" } }, { tag: "path", attrs: { d: "M7.6 19.6l-.7 2M11.8 19.6l-.7 2M16 19.6l-.7 2", ...stroke } }],
      thunder: [{ tag: "path", attrs: { d: "M6.6 15.5a4.6 4.6 0 0 1-.7-9.2 6.4 6.4 0 0 1 12.6 1.5 3.9 3.9 0 0 1-.5 7.7z" } }, { tag: "path", attrs: { d: "M11.6 16.5 9.6 19.6h2.1l-.9 3.4 4-4.8h-2.3l1.6-2.7z" } }],
      pin: [{ tag: "path", attrs: { d: "M12 2a7 7 0 0 0-7 7c0 5.1 7 13 7 13s7-7.9 7-13a7 7 0 0 0-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z" } }]
    };

    function wxIconNode(key) { return svgNode(WX_ICON_PARTS[key] || WX_ICON_PARTS.cloud); }

    function el(tagName, className, text) {
      const node = document.createElement(tagName);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    }

    // Same mapping as the shell's weather Model.js (Open-Meteo → wttr codes → icon)
    function wxIconKey(code, night) {
      const om = { 0: 113, 1: 116, 2: 116, 3: 119, 45: 143, 48: 143, 51: 266, 53: 266, 55: 266, 56: 266, 57: 266, 61: 266, 63: 308, 65: 308, 66: 308, 67: 308, 71: 338, 73: 338, 75: 338, 77: 338, 80: 308, 81: 308, 82: 308, 85: 338, 86: 338, 95: 389, 96: 389, 99: 389 };
      const c = om[code] === undefined ? code : om[code];
      switch (c) {
        case 113: return night ? "moon" : "sun";
        case 116: return night ? "moonCloud" : "sunCloud";
        case 119: case 122: return "cloud";
        case 143: case 248: case 260: return "fog";
        case 176: case 263: case 353: return "drizzle";
        case 179: case 227: case 230: case 323: case 326: case 368: return "snow";
        case 182: case 185: case 281: case 284: case 311: case 314: case 317: case 320: case 350: case 362: case 365: case 374: case 377: return "sleet";
        case 200: case 386: case 389: case 392: case 395: return "thunder";
        case 266: case 293: case 296: case 299: case 302: case 305: case 308: case 356: case 359: return "rain";
        case 329: case 332: case 335: case 338: case 371: return "snow";
        default: return "cloud";
      }
    }

    const weatherBtn = document.getElementById("weatherBtn");
    const wxPanel = document.getElementById("wxPanel");
    const wxHeroIcon = document.getElementById("wxHeroIcon");
    const wxTemp = document.getElementById("wxTemp");
    const wxUnit = document.getElementById("wxUnit");
    const wxLocEdit = document.getElementById("wxLocEdit");
    const wxSuggest = document.getElementById("wxSuggest");
    const wxFeels = document.getElementById("wxFeels");
    const wxWind = document.getElementById("wxWind");
    const wxHumid = document.getElementById("wxHumid");
    const wxDivider = document.getElementById("wxDivider");
    const wxForecast = document.getElementById("wxForecast");
    const wxStatus = document.getElementById("wxStatus");

    const wxState = { current: null, days: [], location: "", settled: false, loading: false, reqId: 0 };
    let wxLocation = null;
    try { wxLocation = JSON.parse(localStorage.getItem("omarchy-weather-location") || "null"); } catch { wxLocation = null; }
    let wxEditing = false;
    let wxSuggestions = [];
    let wxRetries = 0;

    const wxImperial = /^en[_-]US|en[_-]LR|^my[_.]/.test(navigator.language);

    function wxF(c) { return String(Math.round(Number(c) * 9 / 5 + 32)); }
    function wxTempLabel(c) { return wxImperial ? wxF(c) : String(Math.round(Number(c))); }
    function wxTempWithUnit(c) { return wxTempLabel(c) + "°" + (wxImperial ? "F" : "C"); }
    function wxWindLabel(kmh) { return wxImperial ? String(Math.round(Number(kmh) * 0.621371)) + " mph" : String(Math.round(Number(kmh))) + " km/h"; }

    function wxLabel(code, isDay) {
      return wxIconKey(code, isDay);
    }

    function wxIconNodeFor(code, isDay) { return wxIconNode(wxIconKey(code, isDay)); }

    function parseWttr(data) {
      const cur = data.current_condition && data.current_condition[0];
      if (!cur) throw new Error("empty");
      const area = data.nearest_area && data.nearest_area[0];
      const hour = new Date().getHours();
      wxState.current = { tempC: cur.temp_C, feelsC: cur.FeelsLikeC, windKmh: cur.windspeedKmph, humidity: cur.humidity, code: Number(cur.weatherCode), isDay: hour >= 6 && hour < 18 };
      if (wxLocation) wxState.location = wxLocation.name; else wxState.location = area && area.areaName && area.areaName[0] ? area.areaName[0].value : "";
      wxState.days = (data.weather || [])
        .filter(d => String(d.date).slice(0, 10) > todayISO())
        .slice(0, 3)
        .map(d => {
          let code = null, bestDist = 9999;
          for (const h of (d.hourly || [])) {
            const dist = Math.abs(Number(h.time || 0) - 1200);
            if (dist < bestDist) { bestDist = dist; code = Number(h.weatherCode); }
          }
          return { date: d.date, maxC: d.maxtempC, minC: d.mintempC, code };
        });
      wxState.settled = true;
      renderWeather();
    }

    function parseOpenMeteo(data) {
      const c = data.current;
      if (!c) throw new Error("empty");
      wxState.current = { tempC: c.temperature_2m, feelsC: c.apparent_temperature, windKmh: c.wind_speed_10m, humidity: c.relative_humidity_2m, code: Number(c.weather_code), isDay: Number(c.is_day) === 1 };
      wxState.location = wxLocation ? wxLocation.name : "";
      const daily = data.daily || {};
      wxState.days = [];
      for (let i = 0; daily.time && i < daily.time.length && wxState.days.length < 3; i++) {
        if (String(daily.time[i]).slice(0, 10) <= todayISO()) continue;
        wxState.days.push({ date: daily.time[i], maxC: daily.temperature_2m_max[i], minC: daily.temperature_2m_min[i], code: Number(daily.weather_code[i]) });
      }
      wxState.settled = true;
      renderWeather();
    }

    function wxRetry() {
      if (wxRetries >= 3) { renderWeather(); return; }
      wxRetries++;
      setTimeout(wxFetch, 4000);
    }

    function wxFetch() {
      const reqId = ++wxState.reqId;
      wxState.loading = true;
      if (wxState.settled) wxStatus.hidden = true;
      else { wxStatus.hidden = false; wxStatus.textContent = "Fetching forecast…"; }

      if (wxLocation && wxLocation.latitude !== null && wxLocation.latitude !== undefined) {
        const url = "https://api.open-meteo.com/v1/forecast?latitude=" + encodeURIComponent(wxLocation.latitude)
          + "&longitude=" + encodeURIComponent(wxLocation.longitude)
          + "&daily=weather_code,temperature_2m_max,temperature_2m_min"
          + "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day"
          + "&forecast_days=4&timezone=auto";
        fetch(url)
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(data => { if (reqId === wxState.reqId) parseOpenMeteo(data); })
          .catch(() => { if (reqId === wxState.reqId) wxRetry(); });
      } else {
        fetch("https://wttr.in/?format=j1")
          .then(r => { if (!r.ok) throw new Error(); return r.json(); })
          .then(data => { if (reqId === wxState.reqId) parseWttr(data); })
          .catch(() => { if (reqId === wxState.reqId) wxRetry(); });
      }
    }

    function renderWeather() {
      const cur = wxState.current;
      if (!cur && !wxState.settled && wxState.loading) { wxStatus.hidden = false; wxStatus.textContent = "Fetching forecast…"; return; }
      if (!cur) { wxStatus.hidden = false; wxStatus.textContent = "Weather unavailable"; return; }

      const icon = wxIconNodeFor(cur.code, cur.isDay);
      weatherBtn.replaceChildren(icon);
      weatherBtn.classList.remove("hidden");

      wxHeroIcon.replaceChildren(icon.cloneNode(true));
      wxTemp.textContent = wxTempLabel(cur.tempC);
      wxUnit.textContent = "°" + (wxImperial ? "F" : "C");
      wxFeels.textContent = wxTempWithUnit(cur.feelsC);
      wxWind.textContent = wxWindLabel(cur.windKmh);
      wxHumid.textContent = Math.round(Number(cur.humidity)) + "%";
      wxStatus.hidden = true;

      renderLocMode();

      const hasDays = wxState.days && wxState.days.length > 0;
      wxDivider.hidden = !hasDays;
      wxForecast.replaceChildren();
      for (const day of wxState.days || []) {
        const d = new Date(day.date + "T12:00:00");
        const cell = el("div", "wx-day");
        cell.appendChild(wxIconNodeFor(day.code, false));
        const col = el("div");
        col.appendChild(el("div", "wx-day-name", DAYS_FULL[d.getDay()].toUpperCase()));
        const temps = el("div", "wx-day-temps");
        temps.appendChild(el("span", null, wxTempLabel(day.maxC) + "°"));
        temps.appendChild(el("span", "lo", wxTempLabel(day.minC) + "°"));
        col.appendChild(temps);
        cell.appendChild(col);
        wxForecast.appendChild(cell);
      }
    }

    function renderLocMode() {
      wxLocEdit.replaceChildren();
      if (wxEditing) {
        const input = el("input", "wx-loc-input");
        input.placeholder = "Search city";
        input.autocomplete = "off";
        const clearBtn = el("button", "wx-loc-clear", "\u2715");
        clearBtn.title = "Back to auto (IP) location";
        wxLocEdit.appendChild(input);
        wxLocEdit.appendChild(clearBtn);
        input.value = wxLocation && wxLocation.name ? wxLocation.name : "";
        input.focus();
        input.select();
        const geocode = () => {
          const q = input.value.trim();
          if (q.length < 2) { wxSuggestions = []; wxSuggest.innerHTML = ""; return; }
          fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(q) + "&count=5&language=en&format=json")
            .then(r => r.json())
            .then(data => {
              wxSuggestions = ((data && data.results) || []).map(r => ({ name: r.name, latitude: r.latitude, longitude: r.longitude, region: [r.admin1, r.country].filter(Boolean).join(", ") }));
              wxSuggest.replaceChildren();
              wxSuggestions.forEach((s, i) => {
                const row = el("button", "wx-suggest-row");
                row.appendChild(document.createTextNode(s.name + " "));
                row.appendChild(el("span", "region", s.region));
                row.addEventListener("click", () => commitLocation(wxSuggestions[i]));
                wxSuggest.appendChild(row);
              });
            }).catch(() => {});
        };
        input.addEventListener("input", () => { clearTimeout(input._debounce); input._debounce = setTimeout(geocode, 350); });
        input.addEventListener("keydown", (event) => {
          if (event.key === "Escape") { cancelLocEdit(); }
          else if (event.key === "Enter") { if (wxSuggestions.length) commitLocation(wxSuggestions[0]); }
        });
        clearBtn.addEventListener("click", () => { commitLocation(null); });
      } else {
        const btn = el("button", "wx-location");
        btn.title = "Click to change location";
        btn.appendChild(wxIconNode("pin"));
        btn.appendChild(el("span", null, (wxState.location || "\u2014").toUpperCase()));
        btn.addEventListener("click", () => { wxEditing = true; renderLocMode(); });
        wxLocEdit.appendChild(btn);
      }
    }

    function cancelLocEdit() {
      wxEditing = false;
      wxSuggestions = [];
      wxSuggest.innerHTML = "";
      renderLocMode();
    }

    function commitLocation(loc) {
      wxLocation = loc;
      try { localStorage.setItem("omarchy-weather-location", loc ? JSON.stringify(loc) : "null"); } catch {}
      wxEditing = false;
      wxSuggestions = [];
      wxSuggest.innerHTML = "";
      wxState.settled = false;
      wxRetries = 0;
      wxFetch();
    }

    weatherBtn.addEventListener("click", () => togglePanel(wxPanel));
    weatherBtn.addEventListener("auxclick", (event) => { if (event.button === 1) { event.preventDefault(); wxRetries = 0; wxFetch(); } });
    weatherBtn.addEventListener("contextmenu", (event) => { event.preventDefault(); wxRetries = 0; wxFetch(); });

    /* ── Omarchy shell app (fixed on workspace 1, like the real desktop) ── */

    const appWindow = document.getElementById("appWindow");

    function centerAbout() {
      appWindow.style.left = Math.max(8, Math.round((window.innerWidth - appWindow.offsetWidth) / 2)) + "px";
      appWindow.style.top = Math.max(8, Math.round((window.innerHeight - appWindow.offsetHeight) / 2)) + "px";
    }

    function openAbout() {
      closePanels();
      if (launcher.classList.contains("open")) close();
      appWindow.classList.add("open");
      centerAbout();
    }

    function closeAbout() {
      appWindow.classList.remove("open");
    }

    // The Omarchy shell app lives permanently on workspace 1: it is open on
    // any visit that lands on that workspace and hidden everywhere else.
    function syncAboutWindow() {
      if (Number(document.body.dataset.theme || 1) === 1) openAbout();
      else closeAbout();
    }

    /* ── Videos ────────────────────────────────────────────────── */

    function resetVideos() {
      for (const tile of document.querySelectorAll(".video-tile")) {
        const embed = tile.querySelector(".video-embed");
        if (!embed || !tile._face) continue;
        embed.replaceWith(tile._face);
        tile._face = null;
      }
    }

    for (const tile of document.querySelectorAll(".video-tile")) {
      tile.addEventListener("click", (event) => {
        if (!event.target.closest(".video-face") || tile._face) return;
        const face = tile.querySelector(".video-face");
        tile._face = face;
        const iframe = document.createElement("iframe");
        iframe.className = "video-embed";
        iframe.src = "https://www.youtube.com/embed/" + tile.dataset.video + "?autoplay=1&rel=0";
        iframe.title = "YouTube video player";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        face.replaceWith(iframe);
      });
    }

    /* ── Launcher rows that live on a workspace open it in place ── */

    for (const link of document.querySelectorAll(".link[data-workspace], .app-icon[data-workspace]")) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        setTheme(Number(link.dataset.workspace));
        syncAboutWindow();
        if (launcher.classList.contains("open")) close();
      });
    }

    // Security opens the closable popup, same as the bar icon
    for (const link of document.querySelectorAll(".link[data-security]")) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        securityPop.classList.add("open");
        if (launcher.classList.contains("open")) close();
      });
    }

    /* ── Security popup ────────────────────────────────────────── */

    const securityPop = document.getElementById("securityPop");

    function toggleSecurity() {
      securityPop.classList.toggle("open");
    }

    function closeSecurity() {
      securityPop.classList.remove("open");
    }

    document.getElementById("securityBtn").addEventListener("click", toggleSecurity);
    document.getElementById("securityClose").addEventListener("click", closeSecurity);

    /* ── Brand popup (footer link, same behavior as security) ──── */

    const brandPop = document.getElementById("brandPop");

    function toggleBrand() {
      brandPop.classList.toggle("open");
    }

    document.getElementById("brandBtn").addEventListener("click", (event) => {
      event.preventDefault();
      toggleBrand();
    });
    document.getElementById("brandClose").addEventListener("click", () => brandPop.classList.remove("open"));

    // keep the shell app centered when the window resizes
    window.addEventListener("resize", () => {
      if (appWindow.classList.contains("open")) centerAbout();
    });

    /* ── Panel manager ────────────────────────────────────────── */

    function closePanels() {
      calPanel.classList.remove("open");
      wxPanel.classList.remove("open");
    }

    function openPanel(panel) {
      closePanels();
      if (launcher.classList.contains("open")) close();
      panel.classList.add("open");
    }

    function togglePanel(panel) {
      if (panel.classList.contains("open")) closePanels();
      else openPanel(panel);
    }

    clockBtn.addEventListener("click", () => togglePanel(calPanel));

    document.addEventListener("keydown", (event) => {
      if (launcher.classList.contains("open")) return;
      if (securityPop.classList.contains("open") && event.key === "Escape") { closeSecurity(); return; }
      if (brandPop.classList.contains("open") && event.key === "Escape") { brandPop.classList.remove("open"); return; }
      const calOpen = calPanel.classList.contains("open");
      if (calOpen && !wxEditing) {
        if (event.key === "Escape") { closePanels(); }
        else if (event.key === "ArrowLeft") { event.preventDefault(); moveMonth(-1); }
        else if (event.key === "ArrowRight") { event.preventDefault(); moveMonth(1); }
        else if (event.key === "ArrowUp") { event.preventDefault(); moveMonth(-12); }
        else if (event.key === "ArrowDown") { event.preventDefault(); moveMonth(12); }
        else if (event.key === "[" ) { moveMonth(-1); }
        else if (event.key === "]") { moveMonth(1); }
        else if (event.key === "{") { moveMonth(-12); }
        else if (event.key === "}") { moveMonth(12); }
        else if (event.key === "t" || event.key === "T") { goToToday(); }
        else if (event.key === "w" || event.key === "W") {
          weekStart = weekStart === 1 ? 0 : 1;
          try { localStorage.setItem("omarchy-week-start", String(weekStart)); } catch {}
          renderCal();
        }
      } else if (wxPanel.classList.contains("open") && event.key === "Escape" && !wxEditing) {
        closePanels();
      }
    });

    renderCal();
    wxFetch();
    setInterval(() => { if (!wxEditing) { wxRetries = 0; wxFetch(); } }, 15 * 60 * 1000);

    if (location.hash === "#about") setTheme(1);
    else if (location.hash === "#security") toggleSecurity();
    else if (location.hash === "#brand") toggleBrand();
    syncAboutWindow();
    if (location.hash === "#menu") { open(); } else if (location.hash === "#clock") { openPanel(calPanel); } else if (location.hash === "#weather") { openPanel(wxPanel); }


    document.addEventListener("keydown", (event) => {
      if (!launcher.classList.contains("open")) return;

      if (event.key === "Escape") {
        event.preventDefault();
        close();
      } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        const delta = event.key === "ArrowDown" ? 1 : -1;
        setSelected(currentIndex() < 0 ? 0 : currentIndex() + delta);
      } else if (event.key === "Enter") {
        const visible = visibleLinks();
        if (!visible.length) return;
        const current = visible[currentIndex() < 0 ? 0 : currentIndex()];
        current.click();
      }
    });
