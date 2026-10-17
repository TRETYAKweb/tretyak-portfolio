"use client";

import { useEffect, useState } from "react";

const timeFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: "Europe/Kyiv",
  hour: "numeric",
  minute: "2-digit",
});

function KyivClock() {
  const [time, setTime] = useState("--:--");

  useEffect(() => {
    const update = () => setTime(timeFormat.format(new Date()));
    update();
    const id = setInterval(update, 10_000);
    return () => clearInterval(id);
  }, []);

  return <span suppressHydrationWarning>{time}</span>;
}

export default function Header() {
  const [sound, setSound] = useState(true);

  return (
    <header className="container-x fixed inset-x-0 top-0 z-50 text-(--fg) transition-colors duration-500">
      <div className="grid grid-cols-2 items-start pt-6 md:grid-cols-5">
        <a href="#top" className="flex items-center gap-2 text-[0.8rem] font-bold tracking-tight uppercase">
          <span className="grid size-5 place-items-center rounded-[0.3rem] bg-accent-600 text-[0.7rem] font-bold text-black transition-colors duration-500 in-data-[stage=accent]:bg-black in-data-[stage=accent]:text-accent-600">
            T
          </span>
          Yevhenii Tretyak
        </a>

        <button
          type="button"
          onClick={() => setSound((s) => !s)}
          className="label justify-self-start text-(--fg-muted) max-md:hidden"
        >
          Sound - <span className="text-(--fg)">{sound ? "On" : "Off"}</span>
        </button>

        <span className="max-md:hidden" />

        <p className="label text-(--fg-muted) max-md:hidden">
          Kyiv, UA
          <br />
          <KyivClock />
        </p>

        <div className="flex items-start justify-between max-md:justify-end">
          <p className="label text-(--fg-muted) max-md:hidden">
            50°27&apos;00&quot;N
            <br />
            30°31&apos;24&quot;E
          </p>
          <button
            type="button"
            className="relative bg-white/10 px-5 in-data-[stage=accent]:bg-black/10 py-2.5 text-[0.8rem] font-semibold tracking-wider text-(--fg) uppercase backdrop-blur-sm transition-colors hover:bg-accent-600 hover:text-black"
          >
            <span className="absolute top-0 left-0 size-1.5 border-t border-l border-accent-600 in-data-[stage=accent]:border-black" />
            <span className="absolute right-0 bottom-0 size-1.5 border-r border-b border-accent-600 in-data-[stage=accent]:border-black" />
            Menu
          </button>
        </div>
      </div>
    </header>
  );
}
