const canonicalEntityNames = [
  "Wick Mimic",
  "Fake Breakout Phantom",
  "FOMO Wraith",
  "Risk Mirage"
];

if (canonicalEntityNames.some((name) => name.trim() !== name)) {
  throw new Error("Canonical Entity names must not contain surrounding whitespace.");
}

console.log("Locale validation passed: canonical Entity names remain exact English in the foundation fixture.");
