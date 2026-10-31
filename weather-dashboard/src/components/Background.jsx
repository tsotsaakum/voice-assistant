import { motion } from "framer-motion";
import { themeFor } from "../lib/themes";

export default function Background({ condition, isDay }) {
  const theme = themeFor(condition, isDay);
  const rain = condition === "rain" || condition === "drizzle";
  const snow = condition === "snow";

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" data-testid="background" data-condition={theme.key}>
      <motion.div
        key={theme.key}
        className="absolute inset-0"
        style={{ background: theme.background }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
      />
      <motion.div
        className="absolute -left-16 top-10 h-72 w-72 rounded-full blur-3xl"
        style={{ background: theme.orb }}
        animate={{ x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute right-[-4rem] top-1/3 h-80 w-80 rounded-full blur-3xl opacity-70"
        style={{ background: theme.orb2 }}
        animate={{ x: [0, -24, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/30 to-transparent" />
      {condition === "thunder" && <div className="flash absolute inset-0 bg-violet-100" />}
      {rain && (
        <div className="rain absolute inset-0" aria-hidden="true">
          {Array.from({ length: 36 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 2.8) % 100}%`,
                animationDelay: `${(i % 12) * 0.12}s`,
                opacity: 0.35 + (i % 5) * 0.08,
              }}
            />
          ))}
        </div>
      )}
      {snow && (
        <div className="snow absolute inset-0" aria-hidden="true">
          {Array.from({ length: 28 }, (_, i) => (
            <span
              key={i}
              style={{
                left: `${(i * 3.4) % 100}%`,
                animationDelay: `${(i % 10) * 0.25}s`,
                opacity: 0.7,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
