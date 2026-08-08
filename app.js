// Open-Meteo — Free, accurate, no API key needed
// Uses two-step approach:
// Step 1: Geocoding API to convert city name → lat/lon
// Step 2: Weather API to fetch live weather using coordinates

const GEO_URL     = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

// WMO Weather code → { emoji, label, bg (video category) }
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

// Free video URLs (Mixkit CDN — no key needed)
const bgVideos = {
  sunny:  "https://cdn.mixkit.co/videos/preview/mixkit-sun-in-the-blue-sky-with-trees-2519-large.mp4",
  cloudy: "https://cdn.mixkit.co/videos/preview/mixkit-clouds-and-blue-sky-2408-large.mp4",
  rainy:  "https://cdn.mixkit.co/videos/preview/mixkit-rain-falling-on-the-water-of-a-lake-seen-up-close-18312-large.mp4",
  snowy:  "https://cdn.mixkit.co/videos/preview/mixkit-snowflakes-falling-on-a-forest-33840-large.mp4",
  stormy: "https://cdn.mixkit.co/videos/preview/mixkit-stormy-clouds-in-the-sky-1177-large.mp4",
  foggy:  "https://cdn.mixkit.co/videos/preview/mixkit-going-through-a-heavy-fog-among-bushes-4244-large.mp4",
};

// DOM elements
const cityInput = document.getElementById("city-input");
const searchBtn = document.getElementById("search-btn");
const card      = document.getElementById("weather-card");
const errorMsg  = document.getElementById("error-msg");
const bgVideo   = document.getElementById("bg-video");
const bgSource  = document.getElementById("bg-source");

// Update background video based on weather type
function updateBackground(type) {
  const url = bgVideos[type] ?? bgVideos["sunny"];
  if (bgSource.src === url) return; // already playing

  bgVideo.classList.remove("loaded");
  bgSource.src = url;
  bgVideo.load();
  bgVideo.oncanplay = () => bgVideo.classList.add("loaded");
}

async function getWeather(city) {
  city = city.trim();
  if (!city) return;

  card.style.display = "none";
  errorMsg.style.display = "none";
  searchBtn.textContent = "...";
  searchBtn.disabled = true;

  try {
    // Step 1: Get coordinates from city name
    const geoRes  = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
    const geoData = await geoRes.json();

    if (!geoData.results || geoData.results.length === 0) {
      showError("❌ City not found. Please check the spelling and try again.");
      return;
    }

    const { latitude, longitude, name, country } = geoData.results[0];

    // Step 2: Get weather using coordinates
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
  const info = weatherInfo[code] ?? { emoji: "🌡️", label: "Unknown", bg: "sunny" };

  document.getElementById("city-name").textContent    = `${city}, ${country}`;
  document.getElementById("weather-icon").textContent = info.emoji;
  document.getElementById("temperature").textContent  = `${Math.round(current.temperature_2m)}°C`;
  document.getElementById("description").textContent  = info.label;
  document.getElementById("humidity").textContent     = `${current.relative_humidity_2m}%`;
  document.getElementById("wind").textContent         = `${Math.round(current.wind_speed_10m)} km/h`;
  document.getElementById("feels-like").textContent   = `${Math.round(current.apparent_temperature)}°C`;

  // 🎬 Change background video based on weather
  updateBackground(info.bg);

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
