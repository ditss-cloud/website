// Tambahkan di index.js
app.get("/api/test-logger", (req, res) => {
  res.json({
    message: "This should be logged",
    timestamp: new Date(),
    note: "Check MongoDB ApiLog collection for this request"
  });
});

app.get("/v1/test", (req, res) => {
  res.json({
    message: "Versioned API - should be logged",
    version: "v1"
  });
});

app.get("/not-api", (req, res) => {
  res.json({
    message: "This should NOT be logged",
    note: "This endpoint doesn't match API patterns"
  });
});
