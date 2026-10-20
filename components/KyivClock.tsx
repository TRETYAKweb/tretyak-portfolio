"use client";

import { useEffect, useState } from "react";

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Kyiv",
  hour: "numeric",
  minute: "2-digit",
});

export default function KyivClock() {
  const [time, setTime] = useState("--:--");

  useEffect(() => {
    const update = () => setTime(timeFormat.format(new Date()));
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{time}</span>;
}
