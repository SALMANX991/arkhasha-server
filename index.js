const express = require("express");
const cors = require("cors");
const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

const app = express();
app.use(cors());
app.use(express.json());

const SERP_API_KEY = process.env.SERP_API_KEY;

const TO_SAR = { SAR: 1, USD: 3.75, AED: 1.02, KWD: 12.2, EUR: 4.1, GBP: 4.8 };
function toSAR(price, currency = "SAR") {
  return Math.round(price * (TO_SAR[currency.toUpperCase()] || 1));
}

app.get("/api/prices", async (req, res) => {
  const { q } = req.query;
  if (!q) return res.status(400).json({ error: "missing q" });
  try {
    const url = new URL("https://serpapi.com/search");
    url.searchParams.set("engine", "google_shopping");
    url.searchParams.set("q", q);
    url.searchParams.set("gl", "sa");
    url.searchParams.set("hl", "ar");
    url.searchParams.set("api_key", SERP_API_KEY);

    const data = await fetch(url.toString()).then(r => r.json());
    if (data.error) throw new Error(data.error);

    const results = (data.shopping_results || [])
      .slice(0, 8)
      .map(item => {
        const num = String(item.price || "0").replace(/,/g, "").match(/[\d.]+/);
        const price = num ? parseFloat(num[0]) : 0;
        const currency = item.currency || "SAR";
        return {
          store: item.source || "متجر",
          price: toSAR(price, currency),
          shipping: 0,
          deliveryDays: "",
          condition: "جديد",
          link: item.link || "",
          originalCurrency: currency,
          originalPrice: price,
        };
      })
      .filter(r => r.price > 0)
      .sort((a, b) => a.price - b.price);

    res.json({ query: q, count: results.length, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/", (_req, res) => res.json({ status: "arkhasha API running" }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`running on ${PORT}`));
