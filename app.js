// Open-Meteo — Free, accurate, no API key needed
// Step 1: Geocoding API to convert city name → lat/lon
// Step 2: Weather API to fetch live weather + daily data

const GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO Weather code → { emoji, label, bg }
const weatherInfo = {
  0:  { emoji: "☀️",  label: "Clear Sky",                 bg: "sunny"  },
  1:  { emoji: "🌤️", label: "Mainly Clear",               bg: "sunny"  },
  2:  { emoji: "⛅",  label: "Partly Cloudy",              bg: "cloudy" },
  3:  { emoji: "☁️",  label: "Overcast",                   bg: "cloudy" },
  45: { emoji: "🌫️", label: "Foggy",                      bg: "foggy"  },
  48: { emoji: "🌫️", label: "Icy Fog",                    bg: "foggy"  },
  51: { emoji: "🌦️", label: "Light Drizzle",              bg: "rainy"  },
  53: { emoji: "🌦️", label: "Drizzle",                    bg: "rainy"  },
  55: { emoji: "🌧️", label: "Heavy Drizzle",              bg: "rainy"  },
  61: { emoji: "🌧️", label: "Light Rain",                 bg: "rainy"  },
  63: { emoji: "🌧️", label: "Rain",                       bg: "rainy"  },
  65: { emoji: "🌧️", label: "Heavy Rain",                 bg: "rainy"  },
  71: { emoji: "❄️",  label: "Light Snow",                 bg: "snowy"  },
  73: { emoji: "❄️",  label: "Snow",                       bg: "snowy"  },
  75: { emoji: "❄️",  label: "Heavy Snow",                 bg: "snowy"  },
  77: { emoji: "❄️",  label: "Snow Grains",                bg: "snowy"  },
  80: { emoji: "🌦️", label: "Rain Showers",               bg: "rainy"  },
  81: { emoji: "🌧️", label: "Heavy Showers",              bg: "rainy"  },
  82: { emoji: "🌧️", label: "Violent Showers",            bg: "rainy"  },
  85: { emoji: "❄️",  label: "Snow Showers",               bg: "snowy"  },
  86: { emoji: "❄️",  label: "Heavy Snow Showers",         bg: "snowy"  },
  95: { emoji: "⛈️",  label: "Thunderstorm",               bg: "stormy" },
  96: { emoji: "⛈️",  label: "Thunderstorm w/ Hail",       bg: "stormy" },
  99: { emoji: "⛈️",  label: "Thunderstorm w/ Heavy Hail", bg: "stormy" },
};

// ══════════════════════════════════════════════════════
//  CANVAS WEATHER ENGINE
// ══════════════════════════════════════════════════════
const canvas = document.getElementById("bg-canvas");
const ctx    = canvas.getContext("2d");

let particles    = [];
let currentBg    = "default";
let isDay        = true;

// Lightning
let ltTimer  = 0;
let ltAlpha  = 0;
let ltBolts  = [];

// Sun
let sunAngle = 0;

// Stars
let stars = [];

function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  if (stars.length === 0 || currentBg === "night") buildStars();
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ── Gradients ─────────────────────────────────────────
const gradients = {
  default: ["#1a1a2e", "#16213e", "#0f3460"],
  sunny:   ["#1b6fbe", "#2e9cca", "#f6d94e"],
  night:   ["#05050f", "#0d1025", "#1a1a3e"],
  cloudy:  ["#2e3d4f", "#4a6075", "#708090"],
  rainy:   ["#0a1628", "#152c4a", "#1d3b5e"],
  snowy:   ["#6dadd4", "#9ac8e4", "#d6edf8"],
  stormy:  ["#030308", "#0d0d1a", "#151525"],
  foggy:   ["#485566", "#7a8fa0", "#b0c0cc"],
};

function drawGradientBg(type) {
  const c = gradients[type] || gradients.default;
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height);
  g.addColorStop(0,   c[0]);
  g.addColorStop(0.5, c[1]);
  g.addColorStop(1,   c[2]);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ── Stars (night / clear night) ───────────────────────
function buildStars() {
  stars = [];
  for (let i = 0; i < 180; i++) {
    stars.push({
      x:      Math.random() * canvas.width,
      y:      Math.random() * canvas.height * 0.75,
      r:      Math.random() * 1.4 + 0.3,
      alpha:  Math.random(),
      speed:  Math.random() * 0.015 + 0.005,
      dir:    Math.random() > 0.5 ? 1 : -1,
    });
  }
}

function drawStars() {
  stars.forEach(s => {
    s.alpha += s.speed * s.dir;
    if (s.alpha >= 1 || s.alpha <= 0.05) s.dir *= -1;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,255,255,${s.alpha})`;
    ctx.fill();
  });
}

// ── Moon ──────────────────────────────────────────────
function drawMoon() {
  const mx = canvas.width * 0.78;
  const my = canvas.height * 0.14;
  // Glow
  const glow = ctx.createRadialGradient(mx, my, 5, mx, my, 80);
  glow.addColorStop(0,   "rgba(200,220,255,0.25)");
  glow.addColorStop(1,   "rgba(200,220,255,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(mx, my, 80, 0, Math.PI * 2);
  ctx.fill();
  // Moon body
  ctx.fillStyle = "#ddeeff";
  ctx.beginPath();
  ctx.arc(mx, my, 32, 0, Math.PI * 2);
  ctx.fill();
  // Crescent shadow
  ctx.fillStyle = gradients.night[0];
  ctx.beginPath();
  ctx.arc(mx + 10, my - 5, 28, 0, Math.PI * 2);
  ctx.fill();
}

// ── Sun ───────────────────────────────────────────────
function drawSun() {
  const sx = canvas.width  * 0.78;
  const sy = canvas.height * 0.14;
  sunAngle += 0.004;

  // Outer aura
  const aura = ctx.createRadialGradient(sx, sy, 30, sx, sy, 200);
  aura.addColorStop(0,   "rgba(255,230,80,0.3)");
  aura.addColorStop(0.5, "rgba(255,200,40,0.1)");
  aura.addColorStop(1,   "rgba(255,170,0,0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(sx, sy, 200, 0, Math.PI * 2);
  ctx.fill();

  // Rotating rays
  ctx.save();
  ctx.translate(sx, sy);
  ctx.rotate(sunAngle);
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const inner = 62, outer = 62 + (i % 2 === 0 ? 28 : 18);
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
    ctx.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
    ctx.strokeStyle = `rgba(255,220,60,${i % 2 === 0 ? 0.55 : 0.3})`;
    ctx.lineWidth   = i % 2 === 0 ? 3.5 : 2;
    ctx.lineCap     = "round";
    ctx.stroke();
  }
  ctx.restore();

  // Core gradient
  const core = ctx.createRadialGradient(sx - 8, sy - 8, 0, sx, sy, 52);
  core.addColorStop(0,   "rgba(255,255,200,1)");
  core.addColorStop(0.5, "rgba(255,225,60,1)");
  core.addColorStop(1,   "rgba(255,170,0,0.85)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(sx, sy, 52, 0, Math.PI * 2);
  ctx.fill();

  // Lens flare
  const flares = [
    { dx: -90, r: 8,  a: 0.15 },
    { dx: -150, r: 14, a: 0.08 },
    { dx: -220, r: 5,  a: 0.12 },
  ];
  flares.forEach(f => {
    ctx.beginPath();
    ctx.arc(sx + f.dx, sy, f.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,240,120,${f.a})`;
    ctx.fill();
  });
}

// ── Rain drops ────────────────────────────────────────
function makeRaindrop(heavy) {
  return {
    x:     Math.random() * (canvas.width + 300) - 150,
    y:     Math.random() * -canvas.height,
    len:   heavy ? Math.random() * 28 + 14 : Math.random() * 14 + 7,
    speed: heavy ? Math.random() * 20 + 14 : Math.random() * 12 + 7,
    alpha: Math.random() * 0.45 + 0.25,
    wind:  heavy ? 0.28 : 0.15,
    type:  "rain",
  };
}

function drawRaindrop(p) {
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x - p.len * p.wind, p.y + p.len);
  ctx.strokeStyle = `rgba(180,215,255,${p.alpha})`;
  ctx.lineWidth   = 1.2;
  ctx.stroke();
}

function updateRaindrop(p) {
  p.y += p.speed;
  p.x -= p.speed * p.wind;
  if (p.y > canvas.height + 20 || p.x < -100) {
    p.y = Math.random() * -200;
    p.x = Math.random() * (canvas.width + 300) - 150;
  }
}

// ── Snow ──────────────────────────────────────────────
function makeSnowflake() {
  return {
    x:     Math.random() * canvas.width,
    y:     Math.random() * -canvas.height,
    r:     Math.random() * 4.5 + 1.5,
    speed: Math.random() * 1.4 + 0.4,
    drift: (Math.random() - 0.5) * 0.7,
    angle: Math.random() * Math.PI * 2,
    spin:  (Math.random() - 0.5) * 0.025,
    alpha: Math.random() * 0.55 + 0.45,
    type:  "snow",
  };
}

function drawSnowflake(p) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  ctx.globalAlpha = p.alpha;
  // Arms
  for (let i = 0; i < 6; i++) {
    ctx.save();
    ctx.rotate((i / 6) * Math.PI * 2);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, -p.r * 2.2);
    // Branch
    ctx.moveTo(0, -p.r * 1.1);
    ctx.lineTo(-p.r * 0.5, -p.r * 1.6);
    ctx.moveTo(0, -p.r * 1.1);
    ctx.lineTo(p.r * 0.5, -p.r * 1.6);
    ctx.strokeStyle = "rgba(220,240,255,1)";
    ctx.lineWidth   = 0.9;
    ctx.stroke();
    ctx.restore();
  }
  // Center dot
  ctx.beginPath();
  ctx.arc(0, 0, p.r * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.fill();
  ctx.restore();
}

function updateSnowflake(p) {
  p.y     += p.speed;
  p.x     += p.drift + Math.sin(p.y * 0.018) * 0.4;
  p.angle += p.spin;
  if (p.y > canvas.height + 15 || p.x < -30 || p.x > canvas.width + 30) {
    p.y = Math.random() * -120;
    p.x = Math.random() * canvas.width;
  }
}

// ── Clouds ────────────────────────────────────────────
function makeCloud(dark) {
  return {
    x:     -400,
    y:     Math.random() * canvas.height * 0.55,
    w:     Math.random() * 260 + 140,
    h:     Math.random() * 80 + 45,
    speed: Math.random() * 0.45 + 0.1,
    alpha: dark ? Math.random() * 0.2 + 0.12 : Math.random() * 0.28 + 0.1,
    dark,
    type:  "cloud",
  };
}

function drawCloud(p) {
  ctx.save();
  ctx.globalAlpha = p.alpha;
  const col = p.dark ? "rgba(60,70,90,1)" : "rgba(255,255,255,1)";
  const blur = 14;
  ctx.filter = `blur(${blur}px)`;
  // Main body
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
  // Puffs
  ctx.beginPath();
  ctx.ellipse(p.x - p.w * 0.22, p.y - p.h * 0.22, p.w * 0.32, p.h * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(p.x + p.w * 0.22, p.y - p.h * 0.18, p.w * 0.28, p.h * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function updateCloud(p) {
  p.x += p.speed;
  if (p.x > canvas.width + 450) {
    p.x = -400;
    p.y = Math.random() * canvas.height * 0.55;
  }
}

// ── Fog ───────────────────────────────────────────────
function makeFog(i) {
  return {
    x:     -canvas.width * 0.5,
    y:     canvas.height * (0.18 + i * 0.14),
    w:     canvas.width * 2.4,
    h:     Math.random() * 110 + 70,
    speed: Math.random() * 0.35 + 0.1,
    alpha: 0.05 + i * 0.025,
    type:  "fog",
  };
}

function drawFog(p) {
  const g = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
  g.addColorStop(0,   "rgba(255,255,255,0)");
  g.addColorStop(0.25, `rgba(255,255,255,${p.alpha})`);
  g.addColorStop(0.75, `rgba(255,255,255,${p.alpha})`);
  g.addColorStop(1,   "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(p.x + p.w / 2, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
  ctx.fill();
}

function updateFog(p) {
  p.x += p.speed;
  if (p.x > canvas.width * 0.6) p.x = -canvas.width * 0.8;
}

// ── Lightning bolt (zigzag) ────────────────────────────
function generateBolt() {
  const x = canvas.width * (0.3 + Math.random() * 0.4);
  const points = [{ x, y: canvas.height * 0.1 }];
  let cx = x, cy = canvas.height * 0.1;
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    cx += (Math.random() - 0.5) * 80;
    cy  = canvas.height * 0.1 + (canvas.height * 0.65) * (i / steps);
    points.push({ x: cx, y: cy });
  }
  return { points, alpha: 1, branches: [] };
}

function drawBolt(bolt) {
  if (bolt.alpha <= 0) return;
  ctx.save();
  ctx.shadowBlur  = 24;
  ctx.shadowColor = "rgba(180,210,255,0.9)";
  ctx.strokeStyle = `rgba(230,240,255,${bolt.alpha})`;
  ctx.lineWidth   = 2.5;
  ctx.lineCap     = "round";
  ctx.lineJoin    = "round";
  ctx.beginPath();
  bolt.points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
  ctx.stroke();
  // Thin inner glow
  ctx.strokeStyle = `rgba(255,255,255,${bolt.alpha * 0.7})`;
  ctx.lineWidth   = 1;
  ctx.stroke();
  ctx.restore();
  bolt.alpha -= 0.06;
}

// ── Init particles ─────────────────────────────────────
function initParticles(type, night) {
  particles = [];
  currentBg = night ? "night" : type;
  isDay     = !night;
  ltTimer   = 0;
  ltAlpha   = 0;
  ltBolts   = [];

  if (night && type !== "stormy") {
    buildStars();
    return;
  }

  switch (type) {
    case "rainy":
      for (let i = 0; i < 220; i++) particles.push(makeRaindrop(false));
      break;
    case "stormy":
      for (let i = 0; i < 300; i++) particles.push(makeRaindrop(true));
      // Heavy dark clouds
      for (let i = 0; i < 4; i++) {
        const c = makeCloud(true);
        c.x = Math.random() * canvas.width;
        particles.push(c);
      }
      break;
    case "snowy":
      for (let i = 0; i < 140; i++) particles.push(makeSnowflake());
      break;
    case "cloudy":
      for (let i = 0; i < 6; i++) {
        const c = makeCloud(false);
        c.x = Math.random() * canvas.width;
        particles.push(c);
      }
      break;
    case "foggy":
      for (let i = 0; i < 7; i++) particles.push(makeFog(i));
      break;
    case "sunny":
      buildStars(); // keep array fresh, won't be shown
      break;
  }
}

// ── Animate ───────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  drawGradientBg(currentBg);

  if (currentBg === "night") {
    drawStars();
    drawMoon();
  } else if (currentBg === "sunny") {
    drawSun();
  }

  particles.forEach(p => {
    if (p.type === "rain")  { updateRaindrop(p);  drawRaindrop(p);  }
    if (p.type === "snow")  { updateSnowflake(p); drawSnowflake(p); }
    if (p.type === "cloud") { updateCloud(p);     drawCloud(p);     }
    if (p.type === "fog")   { updateFog(p);       drawFog(p);       }
  });

  // Lightning flashes + bolts
  if (currentBg === "stormy") {
    ltTimer--;
    if (ltTimer <= 0) {
      ltTimer = Math.random() * 180 + 90;
      ltAlpha = 0.5;
      ltBolts = [generateBolt()];
      if (Math.random() > 0.5) ltBolts.push(generateBolt());
    }
    if (ltAlpha > 0) {
      ctx.fillStyle = `rgba(210,225,255,${ltAlpha * 0.4})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ltAlpha *= 0.72;
    }
    ltBolts.forEach(b => drawBolt(b));
    ltBolts = ltBolts.filter(b => b.alpha > 0);
  }
}
animate();

// ══════════════════════════════════════════════════════
//  HELPER FORMATTERS
// ══════════════════════════════════════════════════════
function windDirection(deg) {
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

function uvLabel(uv) {
  if (uv <= 2)  return `${uv} · Low`;
  if (uv <= 5)  return `${uv} · Moderate`;
  if (uv <= 7)  return `${uv} · High`;
  if (uv <= 10) return `${uv} · Very High`;
  return `${uv} · Extreme`;
}

function formatVisibility(m) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function formatTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDateTime(timezone) {
  return new Date().toLocaleString("en-US", {
    timeZone: timezone,
    weekday: "long",
    hour:    "2-digit",
    minute:  "2-digit",
    hour12:  true,
  });
}

// ══════════════════════════════════════════════════════
//  WEATHER FETCH
// ══════════════════════════════════════════════════════
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const card      = document.getElementById("weather-card");
const errorMsg  = document.getElementById("error-msg");

async function getWeather(city) {
  city = city.trim();
  if (!city) return;

  card.style.display     = "none";
  errorMsg.style.display = "none";
  searchBtn.textContent  = "...";
  searchBtn.disabled     = true;

  try {
    // Step 1: Geocode
    const geoRes  = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();
    if (!geoData.results?.length) {
      showError("❌ City not found. Please check the spelling and try again.");
      return;
    }

    const { latitude, longitude, name, country, timezone } = geoData.results[0];

    // Step 2: Weather — current + daily
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: [
        "temperature_2m", "apparent_temperature", "relative_humidity_2m",
        "dew_point_2m", "weather_code", "wind_speed_10m", "wind_direction_10m",
        "surface_pressure", "visibility", "uv_index", "cloud_cover",
        "precipitation", "is_day"
      ].join(","),
      daily:         "sunrise,sunset,precipitation_probability_max",
      forecast_days: 1,
      wind_speed_unit: "kmh",
      timezone:      timezone || "auto",
    });

    const res  = await fetch(`${WEATHER_URL}?${params}`);
    const data = await res.json();

    showWeather(name, country, timezone, data.current, data.daily);

  } catch {
    showError("🌐 Network error. Please check your internet connection.");
  } finally {
    searchBtn.textContent = "Search";
    searchBtn.disabled    = false;
  }
}

function showWeather(city, country, timezone, cur, daily) {
  const code  = cur.weather_code;
  const info  = weatherInfo[code] ?? { emoji: "🌡️", label: "Unknown", bg: "cloudy" };
  const night = cur.is_day === 0;

  // Header
  document.getElementById("city-name").textContent = `${city}, ${country}`;
  document.getElementById("date-time").textContent  = formatDateTime(timezone);

  // Main
  document.getElementById("weather-icon").textContent = info.emoji;
  document.getElementById("temperature").textContent  = `${Math.round(cur.temperature_2m)}°C`;
  document.getElementById("feels-like").textContent   = `${Math.round(cur.apparent_temperature)}°C`;
  document.getElementById("description").textContent  = info.label;

  // Details grid
  document.getElementById("humidity").textContent    = `${cur.relative_humidity_2m}%`;
  document.getElementById("wind").textContent        = `${Math.round(cur.wind_speed_10m)} km/h ${windDirection(cur.wind_direction_10m)}`;
  document.getElementById("uv-index").textContent    = night ? "—" : uvLabel(Math.round(cur.uv_index ?? 0));
  document.getElementById("visibility").textContent  = formatVisibility(cur.visibility ?? 10000);
  document.getElementById("dew-point").textContent   = `${Math.round(cur.dew_point_2m)}°C`;
  document.getElementById("pressure").textContent    = `${Math.round(cur.surface_pressure)} hPa`;
  document.getElementById("sunrise").textContent     = formatTime(daily.sunrise[0]);
  document.getElementById("sunset").textContent      = formatTime(daily.sunset[0]);
  document.getElementById("rain-chance").textContent = `${daily.precipitation_probability_max[0] ?? 0}%`;
  document.getElementById("cloud-cover").textContent = `${cur.cloud_cover}%`;

  // 🎨 Switch background animation
  initParticles(info.bg, night);

  card.style.display = "block";
}

function showError(msg) {
  errorMsg.textContent   = msg;
  errorMsg.style.display = "block";
}

// Events
searchBtn.addEventListener("click",   () => getWeather(cityInput.value));
cityInput.addEventListener("keydown", (e) => { if (e.key === "Enter") getWeather(cityInput.value); });

// Auto-focus on load
window.addEventListener("load", () => cityInput.focus());
