export const THEMES = {
  clear: {
    day: "radial-gradient(1200px 700px at 70% -10%, rgba(240,176,122,0.55), transparent 55%), radial-gradient(900px 600px at 10% 20%, rgba(88,70,180,0.45), transparent 60%), linear-gradient(180deg, #241447 0%, #3a2a6e 38%, #6a4a78 72%, #1a1638 100%)",
    night: "radial-gradient(800px 500px at 80% 10%, rgba(186,198,255,0.28), transparent 50%), radial-gradient(900px 700px at 0% 80%, rgba(64,48,140,0.45), transparent 55%), linear-gradient(180deg, #070714 0%, #141433 46%, #1c1a44 100%)",
    orb: "#f0b48a",
    orb2: "#7c6adf",
  },
  partly: {
    day: "radial-gradient(900px 520px at 78% 0%, rgba(232,186,140,0.4), transparent 52%), radial-gradient(800px 600px at 8% 30%, rgba(70,90,160,0.4), transparent 60%), linear-gradient(180deg, #1a2048 0%, #2c3a68 48%, #3d4e78 100%)",
    night: "radial-gradient(700px 420px at 75% 8%, rgba(180,190,230,0.22), transparent 50%), linear-gradient(180deg, #0c1228 0%, #1a2444 50%, #243056 100%)",
    orb: "#d7c4a4",
    orb2: "#6d86c4",
  },
  cloudy: {
    day: "radial-gradient(1000px 600px at 50% -10%, rgba(170,180,200,0.28), transparent 55%), linear-gradient(180deg, #1a2030 0%, #2a3348 42%, #3a455c 100%)",
    night: "linear-gradient(180deg, #10141f 0%, #1c2433 48%, #2a3344 100%)",
    orb: "#9aa6b8",
    orb2: "#66748c",
  },
  fog: {
    day: "linear-gradient(180deg, #2a2c3c 0%, #4a4c5e 45%, #6a6c7c 100%)",
    night: "linear-gradient(180deg, #16161f 0%, #2a2a38 55%, #3a3a4a 100%)",
    orb: "#c8c6d4",
    orb2: "#8a88a0",
  },
  drizzle: {
    day: "radial-gradient(800px 500px at 20% 0%, rgba(120,170,190,0.35), transparent 55%), linear-gradient(180deg, #122033 0%, #1a3a4e 50%, #245066 100%)",
    night: "linear-gradient(180deg, #0c1824 0%, #143044 55%, #1a3c52 100%)",
    orb: "#7eb0c4",
    orb2: "#3d7c96",
  },
  rain: {
    day: "radial-gradient(900px 500px at 80% 0%, rgba(80,140,170,0.3), transparent 50%), linear-gradient(180deg, #0d1c2e 0%, #16344c 46%, #1d4d66 100%)",
    night: "linear-gradient(180deg, #081018 0%, #102433 48%, #163848 100%)",
    orb: "#6aa4be",
    orb2: "#2f6d8c",
  },
  snow: {
    day: "radial-gradient(800px 480px at 70% 0%, rgba(230,236,255,0.45), transparent 50%), linear-gradient(180deg, #243044 0%, #3c4e68 48%, #8ea0b8 100%)",
    night: "linear-gradient(180deg, #121826 0%, #243044 50%, #3a4a60 100%)",
    orb: "#e7eef8",
    orb2: "#9eb0c8",
  },
  thunder: {
    day: "radial-gradient(700px 420px at 60% 10%, rgba(170,120,255,0.35), transparent 50%), linear-gradient(180deg, #140818 0%, #2a1248 42%, #3a1860 100%)",
    night: "linear-gradient(180deg, #0c0614 0%, #1c0c30 46%, #301450 100%)",
    orb: "#c084fc",
    orb2: "#7c3aed",
  },
};

export function themeFor(condition, isDay) {
  const theme = THEMES[condition] || THEMES.cloudy;
  return {
    background: isDay ? theme.day : theme.night,
    orb: theme.orb,
    orb2: theme.orb2,
    key: `${condition}-${isDay ? "day" : "night"}`,
  };
}
