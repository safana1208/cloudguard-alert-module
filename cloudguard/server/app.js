const express = require("express");
const alertsRoutes = require("./routes/alerts");

const app = express();
app.use(express.json());

app.use("/api/alerts", alertsRoutes);

app.get("/health", (req, res) => res.json({ status: "ok" }));

module.exports = app;
