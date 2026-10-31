import { motion } from "framer-motion";
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
} from "lucide-react";
import { describeCode } from "../lib/weather";

const ICONS = {
  clear: { day: Sun, night: Moon },
  partly: { day: CloudSun, night: CloudMoon },
  cloudy: { day: Cloud, night: Cloud },
  fog: { day: CloudFog, night: CloudFog },
  drizzle: { day: CloudDrizzle, night: CloudDrizzle },
  rain: { day: CloudRain, night: CloudRain },
  snow: { day: CloudSnow, night: CloudSnow },
  thunder: { day: CloudLightning, night: CloudLightning },
};

export default function WeatherIcon({ code, isDay = true, size = 48, animate = true, className = "" }) {
  const { key } = describeCode(code);
  const pair = ICONS[key] || ICONS.cloudy;
  const Icon = pair[isDay ? "day" : "night"];
  const spin = animate && key === "clear" && isDay;
  const flash = animate && key === "thunder";
  const float = animate && !spin && !flash;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <span className="absolute inset-1 rounded-full bg-white/25 blur-md" aria-hidden="true" />
      {(key === "rain" || key === "drizzle") && animate && (
        <span className="pointer-events-none absolute inset-x-1 bottom-0 top-1/2 overflow-hidden" aria-hidden="true">
          {[0, 1, 2].map((drop) => (
            <motion.span
              key={drop}
              className="absolute top-0 w-px rounded-full bg-white/80"
              style={{ left: `${22 + drop * 26}%`, height: key === "drizzle" ? 8 : 12 }}
              animate={{ y: [0, size * 0.45], opacity: [0, 1, 0] }}
              transition={{ duration: 0.9, repeat: Infinity, delay: drop * 0.2, ease: "easeIn" }}
            />
          ))}
        </span>
      )}
      <motion.span
        className="relative text-white"
        animate={
          spin ? { rotate: 360 } : flash ? { opacity: [1, 0.35, 1, 0.55, 1] } : float ? { y: [0, -5, 0] } : undefined
        }
        transition={
          spin
            ? { duration: 22, repeat: Infinity, ease: "linear" }
            : flash
              ? { duration: 2.2, repeat: Infinity }
              : float
                ? { duration: 4.2, repeat: Infinity, ease: "easeInOut" }
                : undefined
        }
      >
        <Icon size={size} strokeWidth={1.45} />
      </motion.span>
    </div>
  );
}
