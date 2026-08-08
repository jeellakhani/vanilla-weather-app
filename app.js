// Open-Meteo — Free, accurate, no API key needed
// Step 1: Geocoding API to convert city name → lat/lon
// Step 2: Weather API to fetch live weather using coordinates

const GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO Weather code → { emoji, label, bg }
const weatherInfo = {
  0:  { emoji: "☀️",  label: "Clear Sky",                  bg: "sunny"  },
  1:  { emoji: "🌤️", label: "Mainly Clear",                bg: "sunny"  },
  2:  { emoji: "⛅",  label: "Partly Cloudy",               bg: "cloudy" },
  3:  { emoji: "☁️",  label: "Overcast",                    bg: "cloudy" },
  45: { emoji: "🌫️", label: "Foggy",                       bg: "foggy"  },
  48: { emoji: "🌫️", label: "Icy Fog",                     bg: "foggy"  },
  51: { emoji: "🌦️", label: "Light Drizzle",               bg: "rainy"  },
  53: { emoji: "🌦️", label: "Drizzle",                     bg: "rainy"  },
  55: { emoji: "🌧️", label: "Heavy Drizzle",               bg: "rainy"  },
  61: { emoji: "🌧️", label: "Light Rain",                  bg: "rainy"  },
  63: { emoji: "🌧️", label: "Rain",                        bg: "rainy"  },
  65: { emoji: "🌧️", label: "Heavy Rain",                  bg: "rainy"  },
  71: { emoji: "❄️",  label: "Light Snow",                  bg: "snowy"  },
  73: { emoji: "❄️",  label: "Snow",                        bg: "snowy"  },
  75: { emoji: "❄️",  label: "Heavy Snow",                  bg: "snowy"  },
  77: { emoji: "❄️",  label: "Snow Grains",                 bg: "snowy"  },
  80: { emoji: "🌦️", label: "Rain Showers",                bg: "rainy"  },
  81: { emoji: "🌧️", label: "Heavy Showers",               bg: "rainy"  },
  82: { emoji: "🌧️", label: "Violent Showers",             bg: "rainy"  },
  85: { emoji: "❄️",  label: "Snow Showers",                bg: "snowy"  },
  86: { emoji: "❄️",  label: "Heavy Snow Showers",          bg: "snowy"  },
  95: { emoji: "⛈️",  label: "Thunderstorm",                bg: "stormy" },
  96: { emoji: "⛈️",  label: "Thunderstorm w/ Hail",        bg: "stormy" },
  99: { emoji: "⛈️",  label: "Thunderstorm w/ Heavy Hail",  bg: "stormy" },
};

// ════════════════════════════════════════════════════════
//  CANVAS WEATHER ENGINE
// ════════════════════════════════════════════════════════
const canvas  = document.getElementById("bg-canvas");
const ctx     = canvas.getContext("2d");
let particles = [];
let animFrame = null;
let currentBg = "default";
let lightningTimer = 0;
let lightningAlpha = 0;

// Resize canvas to fill screen
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

// ── Background gradients ───────────────────────────────
const gradients = {
  default: ["#1a1a2e", "#16213e", "#0f3460"],
  sunny:   ["#0b4f8c", "#1a7fc1", "#f9c846"],
  cloudy:  ["#3b4a5a", "#5f7080", "#8fa3b1"],
  rainy:   ["#0d1b2a", "#1b3a5c", "#1e3a5f"],
  snowy:   ["#6ea8d4", "#a8cde0", "#ddeef7"],
  stormy:  ["#050505", "#0f0f1a", "#1a1a2e"],
  foggy:   ["#5a6474", "#8a9aaa", "#bccad4"],
};

function drawBackground(type) {
  const cols = gradients[type] || gradients.default;
  const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
  grad.addColorStop(0,   cols[0]);
  grad.addColorStop(0.5, cols[1]);
  grad.addColorStop(1,   cols[2]);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

// ── Particle factories ─────────────────────────────────
function makeRaindrop(heavy = false) {
  return {
    x:     Math.random() * canvas.width,
    y:     Math.random() * -canvas.height,
    len:   heavy ? Math.random() * 25 + 15 : Math.random() * 15 + 8,
    speed: heavy ? Math.random() * 18 + 14 : Math.random() * 10 + 8,
    alpha: Math.random() * 0.4 + 0.3,
    type:  "rain",
  };
}

function makeSnowflake() {
  return {
    x:      Math.random() * canvas.width,
    y:      Math.random() * -canvas.height,
    r:      Math.random() * 4 + 2,
    speed:  Math.random() * 1.5 + 0.5,
    drift:  (Math.random() - 0.5) * 0.6,
    alpha:  Math.random() * 0.5 + 0.5,
    angle:  Math.random() * Math.PI * 2,
    type:   "snow",
  };
}

function makeCloud() {
  return {
    x:     -350,
    y:     Math.random() * canvas.height * 0.6,
    w:     Math.random() * 220 + 140,
    h:     Math.random() * 70 + 40,
    speed: Math.random() * 0.4 + 0.15,
    alpha: Math.random() * 0.25 + 0.12,
    type:  "cloud",
  };
}

function makeFogLayer(index) {
  return {
    x:     -canvas.width * 0.3,
    y:     canvas.height * (0.2 + index * 0.15),
    w:     canvas.width * 2,
    h:     Math.random() * 120 + 80,
    speed: Math.random() * 0.3 + 0.1,
    alpha: 0.06 + index * 0.03,
    type:  "fog",
  };
}

// ── Initialize particles by weather type ───────────────
function initParticles(type) {
  particles = [];
  currentBg = type;
  lightningTimer = 0;
  lightningAlpha = 0;

  if (type === "rainy") {
    for (let i = 0; i < 200; i++) particles.push(makeRaindrop(false));
  }
  else if (type === "stormy") {
    for (let i = 0; i < 280; i++) particles.push(makeRaindrop(true));
  }
  else if (type === "snowy") {
    for (let i = 0; i < 120; i++) particles.push(makeSnowflake());
  }
  else if (type === "cloudy") {
    for (let i = 0; i < 5; i++) {
      const c = makeCloud();
      c.x = Math.random() * canvas.width; // spread on init
      particles.push(c);
    }
  }
  else if (type === "foggy") {
    for (let i = 0; i < 6; i++) particles.push(makeFogLayer(i));
  }
}

// ── Draw particles ─────────────────────────────────────
function drawParticle(p) {
  ctx.save();

  if (p.type === "rain") {
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - p.len * 0.18, p.y + p.len);
    ctx.strokeStyle = `rgba(180, 215, 255, ${p.alpha})`;
    ctx.lineWidth = 1.2;
    ctx.stroke();
  }
  else if (p.type === "snow") {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
    ctx.fill();
    // sparkle cross
    ctx.strokeStyle = `rgba(255, 255, 255, ${p.alpha * 0.6})`;
    ctx.lineWidth = 0.8;
    for (let a = 0; a < 3; a++) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.angle + (a * Math.PI) / 3);
      ctx.beginPath();
      ctx.moveTo(0, -p.r * 1.8);
      ctx.lineTo(0,  p.r * 1.8);
      ctx.stroke();
      ctx.restore();
    }
  }
  else if (p.type === "cloud") {
    ctx.globalAlpha = p.alpha;
    ctx.fillStyle   = "rgba(255, 255, 255, 1)";
    ctx.beginPath();
    ctx.ellipse(p.x, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x - p.w * 0.2, p.y - p.h * 0.2, p.w * 0.35, p.h * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(p.x + p.w * 0.2, p.y - p.h * 0.15, p.w * 0.3, p.h * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  else if (p.type === "fog") {
    const grad = ctx.createLinearGradient(p.x, p.y, p.x + p.w, p.y);
    grad.addColorStop(0,   "rgba(255,255,255,0)");
    grad.addColorStop(0.3, `rgba(255,255,255,${p.alpha})`);
    grad.addColorStop(0.7, `rgba(255,255,255,${p.alpha})`);
    grad.addColorStop(1,   "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(p.x + p.w / 2, p.y, p.w / 2, p.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}

// ── Update particle positions ──────────────────────────
function updateParticle(p) {
  if (p.type === "rain") {
    p.y += p.speed;
    p.x -= p.speed * 0.18;
    if (p.y > canvas.height + 30) {
      p.y = Math.random() * -100;
      p.x = Math.random() * canvas.width;
    }
  }
  else if (p.type === "snow") {
    p.y     += p.speed;
    p.x     += p.drift + Math.sin(p.y * 0.02) * 0.5;
    p.angle += 0.01;
    if (p.y > canvas.height + 10 || p.x < -10 || p.x > canvas.width + 10) {
      p.y = Math.random() * -80;
      p.x = Math.random() * canvas.width;
    }
  }
  else if (p.type === "cloud") {
    p.x += p.speed;
    if (p.x > canvas.width + 400) {
      p.x = -350;
      p.y = Math.random() * canvas.height * 0.6;
    }
  }
  else if (p.type === "fog") {
    p.x += p.speed;
    if (p.x > canvas.width * 0.5) p.x = -canvas.width * 0.8;
  }
}

// ── Draw sun (for sunny weather) ───────────────────────
let sunAngle = 0;
function drawSun() {
  const cx = canvas.width  * 0.75;
  const cy = canvas.height * 0.18;
  sunAngle += 0.003;

  // Outer glow
  const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 180);
  glow.addColorStop(0,   "rgba(255, 230, 80, 0.35)");
  glow.addColorStop(0.4, "rgba(255, 200, 40, 0.12)");
  glow.addColorStop(1,   "rgba(255, 180, 0, 0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.fill();

  // Rays
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(sunAngle);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * 55, Math.sin(a) * 55);
    ctx.lineTo(Math.cos(a) * 110, Math.sin(a) * 110);
    ctx.strokeStyle = `rgba(255, 220, 50, ${0.15 + (i % 2) * 0.1})`;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.stroke();
  }
  ctx.restore();

  // Core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50);
  core.addColorStop(0,   "rgba(255, 255, 200, 1)");
  core.addColorStop(0.5, "rgba(255, 220, 60,  1)");
  core.addColorStop(1,   "rgba(255, 180, 0,   0.8)");
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 50, 0, Math.PI * 2);
  ctx.fill();
}

// ── Lightning flash ────────────────────────────────────
function drawLightning() {
  lightningTimer--;
  if (lightningTimer <= 0) {
    lightningTimer = Math.random() * 200 + 120;
    lightningAlpha = 0.7;
  }
  if (lightningAlpha > 0) {
    ctx.fillStyle = `rgba(220, 230, 255, ${lightningAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    lightningAlpha *= 0.75;
    if (lightningAlpha < 0.01) lightningAlpha = 0;
  }
}

// ── Main animation loop ────────────────────────────────
function animate() {
  animFrame = requestAnimationFrame(animate);
  drawBackground(currentBg);

  if (currentBg === "sunny") {
    drawSun();
  }

  particles.forEach(p => {
    updateParticle(p);
    drawParticle(p);
  });

  if (currentBg === "stormy") {
    drawLightning();
  }
}

// Start loop immediately (shows default dark bg)
animate();

// ════════════════════════════════════════════════════════
//  WEATHER FETCH
// ════════════════════════════════════════════════════════
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const card      = document.getElementById("weather-card");
const errorMsg  = document.getElementById("error-msg");

async function getWeather(city) {
  city = city.trim();
  if (!city) return;

  card.style.display  = "none";
  errorMsg.style.display = "none";
  searchBtn.textContent  = "...";
  searchBtn.disabled     = true;

  try {
    // Step 1: Geocode city
    const geoRes  = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showError("❌ City not found. Please check the spelling and try again.");
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 2: Fetch weather
    const params = new URLSearchParams({
      latitude,
      longitude,
      current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m",
      wind_speed_unit: "kmh",
      timezone: "auto",
    });

    const weatherRes  = await fetch(`${WEATHER_URL}?${params}`);
    const weatherData = await weatherRes.json();
    showWeather(name, country, weatherData.current);

  } catch (err) {
    showError("🌐 Network error. Please check your internet connection.");
  } finally {
    searchBtn.textContent = "Search";
    searchBtn.disabled    = false;
  }
}

function showWeather(city, country, current) {
  const code = current.weather_code;
  const info = weatherInfo[code] ?? { emoji: "🌡️", label: "Unknown", bg: "cloudy" };

  document.getElementById("city-name").textContent    = `${city}, ${country}`;
  document.getElementById("weather-icon").textContent = info.emoji;
  document.getElementById("temperature").textContent  = `${Math.round(current.temperature_2m)}°C`;
  document.getElementById("description").textContent  = info.label;
  document.getElementById("humidity").textContent     = `${current.relative_humidity_2m}%`;
  document.getElementById("wind").textContent         = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById("feels-like").textContent   = `${Math.round(current.apparent_temperature)}°C`;

  // 🎨 Switch animated background
  initParticles(info.bg);

  card.style.display = "block";
}

function showError(msg) {
  errorMsg.textContent   = msg;
  errorMsg.style.display = "block";
}

// Events
searchBtn.addEventListener("click",  () => getWeather(cityInput.value));
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") getWeather(cityInput.value);
});

// Auto-focus on load
window.addEventListener("load", () => cityInput.focus());
