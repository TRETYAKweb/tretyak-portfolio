"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

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
  return (
    <header className="container-x fixed inset-x-0 top-0 z-50 text-(--fg) transition-colors duration-500">
      <div className="grid grid-cols-2 items-start pt-6 md:grid-cols-5">
        <a href="#top" className="flex items-center gap-2 text-[0.8rem] font-bold tracking-tight uppercase">
          <Image src="/img/logo.png" alt="" width={140} height={138} preload className="size-[2.2rem]" />
          Yevhenii Tretyak
        </a>

        <span className="col-span-2 max-md:hidden" />

        <p className="label text-(--fg-muted) max-md:hidden">
          Kyiv, UA
          <br />
          <KyivClock />
        </p>

        <div className="flex items-start justify-end">
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
