const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.json({ message: "alerts endpoint works" });
});

module.exports = router;
