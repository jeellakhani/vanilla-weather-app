// Open-Meteo — Free, accurate, no API key needed
// Uses two-step approach:
// Step 1: Geocoding API to convert city name → lat/lon
// Step 2: Weather API to fetch live weather using coordinates

const GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO Weather code → { emoji, label, bg }
const weatherInfo = {
  0:  { emoji: "☀️",  label: "Clear Sky",                  bg: "sunny" },
  1:  { emoji: "🌤️", label: "Mainly Clear",                bg: "sunny" },
  2:  { emoji: "⛅",  label: "Partly Cloudy",               bg: "cloudy" },
  3:  { emoji: "☁️",  label: "Overcast",                    bg: "cloudy" },
  45: { emoji: "🌫️", label: "Foggy",                       bg: "foggy" },
  48: { emoji: "🌫️", label: "Icy Fog",                     bg: "foggy" },
  51: { emoji: "🌦️", label: "Light Drizzle",               bg: "rainy" },
  53: { emoji: "🌦️", label: "Drizzle",                     bg: "rainy" },
  55: { emoji: "🌧️", label: "Heavy Drizzle",               bg: "rainy" },
  61: { emoji: "🌧️", label: "Light Rain",                  bg: "rainy" },
  63: { emoji: "🌧️", label: "Rain",                        bg: "rainy" },
  65: { emoji: "🌧️", label: "Heavy Rain",                  bg: "rainy" },
  71: { emoji: "❄️",  label: "Light Snow",                  bg: "snowy" },
  73: { emoji: "❄️",  label: "Snow",                        bg: "snowy" },
  75: { emoji: "❄️",  label: "Heavy Snow",                  bg: "snowy" },
  77: { emoji: "❄️",  label: "Snow Grains",                 bg: "snowy" },
  80: { emoji: "🌦️", label: "Rain Showers",                bg: "rainy" },
  81: { emoji: "🌧️", label: "Heavy Showers",               bg: "rainy" },
  82: { emoji: "🌧️", label: "Violent Showers",             bg: "rainy" },
  85: { emoji: "❄️",  label: "Snow Showers",                bg: "snowy" },
  86: { emoji: "❄️",  label: "Heavy Snow Showers",          bg: "snowy" },
  95: { emoji: "⛈️",  label: "Thunderstorm",                bg: "stormy" },
  96: { emoji: "⛈️",  label: "Thunderstorm w/ Hail",        bg: "stormy" },
  99: { emoji: "⛈️",  label: "Thunderstorm w/ Heavy Hail",  bg: "stormy" },
};

// DOM elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const card      = document.getElementById("weather-card");
const errorMsg  = document.getElementById("error-msg");
const bgEffect  = document.getElementById("bg-effect");

// ─── Animated Background Generator ───────────────────────────
function setBackground(type) {
  // Clear old particles + classes
  bgEffect.innerHTML = "";
  bgEffect.className = `bg-${type}`;

  switch (type) {

    case "sunny": {
      // Glowing sun core
      const core = document.createElement("div");
      core.className = "sun-core";
      bgEffect.appendChild(core);
      // Rotating rays
      for (let i = 0; i < 14; i++) {
        const ray = document.createElement("div");
        ray.className = "sun-ray";
        const len = Math.random() * 180 + 120;
        ray.style.cssText = `
          height: ${len}px;
          transform: rotate(${i * 26}deg);
          animation-duration: ${10 + i * 1.5}s;
          opacity: ${Math.random() * 0.4 + 0.2};
        `;
        bgEffect.appendChild(ray);
      }
      break;
    }

    case "rainy": {
      for (let i = 0; i < 130; i++) {
        const drop = document.createElement("div");
        drop.className = "raindrop";
        drop.style.cssText = `
          left: ${Math.random() * 100}%;
          height: ${Math.random() * 18 + 10}px;
          animation-duration: ${Math.random() * 0.4 + 0.35}s;
          animation-delay: -${Math.random() * 2}s;
          opacity: ${Math.random() * 0.5 + 0.3};
        `;
        bgEffect.appendChild(drop);
      }
      break;
    }

    case "snowy": {
      const flakes = ["❄", "❅", "❆", "✦", "•"];
      for (let i = 0; i < 70; i++) {
        const flake = document.createElement("div");
        flake.className = "snowflake";
        flake.textContent = flakes[Math.floor(Math.random() * flakes.length)];
        flake.style.cssText = `
          left: ${Math.random() * 100}%;
          font-size: ${Math.random() * 14 + 8}px;
          animation-duration: ${Math.random() * 5 + 4}s;
          animation-delay: -${Math.random() * 6}s;
          opacity: ${Math.random() * 0.5 + 0.4};
        `;
        bgEffect.appendChild(flake);
      }
      break;
    }

    case "stormy": {
      // Heavy rain
      for (let i = 0; i < 170; i++) {
        const drop = document.createElement("div");
        drop.className = "raindrop";
        drop.style.cssText = `
          left: ${Math.random() * 100}%;
          height: ${Math.random() * 25 + 15}px;
          width: 1px;
          animation-duration: ${Math.random() * 0.3 + 0.25}s;
          animation-delay: -${Math.random() * 2}s;
          opacity: ${Math.random() * 0.6 + 0.3};
        `;
        bgEffect.appendChild(drop);
      }
      // Lightning flash
      const flash = document.createElement("div");
      flash.className = "lightning-flash";
      flash.style.animationDuration = `${Math.random() * 2 + 3}s`;
      flash.style.animationDelay    = `${Math.random() * 2}s`;
      bgEffect.appendChild(flash);
      break;
    }

    case "cloudy": {
      for (let i = 0; i < 7; i++) {
        const cloud = document.createElement("div");
        cloud.className = "cloud";
        cloud.style.cssText = `
          top: ${Math.random() * 70}%;
          width: ${Math.random() * 250 + 120}px;
          height: ${Math.random() * 70 + 40}px;
          animation-duration: ${Math.random() * 25 + 20}s;
          animation-delay: -${Math.random() * 15}s;
          opacity: ${Math.random() * 0.35 + 0.15};
        `;
        bgEffect.appendChild(cloud);
      }
      break;
    }

    case "foggy": {
      for (let i = 0; i < 6; i++) {
        const fog = document.createElement("div");
        fog.className = "fog-layer";
        fog.style.cssText = `
          top: ${15 + i * 14}%;
          height: ${Math.random() * 80 + 60}px;
          animation-duration: ${12 + i * 4}s;
          animation-delay: -${i * 3}s;
          opacity: ${0.1 + i * 0.04};
        `;
        bgEffect.appendChild(fog);
      }
      break;
    }
  }
}

// ─── Fetch Weather ────────────────────────────────────────────
async function getWeather(city) {
  city = city.trim();
  if (!city) return;

  card.style.display = "none";
  errorMsg.style.display = "none";
  searchBtn.textContent = "...";
  searchBtn.disabled = true;

  try {
    // Step 1: Geocode
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
    searchBtn.disabled = false;
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

  // 🎨 Animate background based on weather
  setBackground(info.bg);

  card.style.display = "block";
}

function showError(msg) {
  errorMsg.textContent = msg;
  errorMsg.style.display = "block";
}

// Events
searchBtn.addEventListener("click", () => getWeather(cityInput.value));
cityInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") getWeather(cityInput.value);
});

// Auto-focus input on page load
window.addEventListener("load", () => cityInput.focus());
