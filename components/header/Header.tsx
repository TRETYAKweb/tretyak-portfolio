"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import CornerButton from "@/components/ui/CornerButton";
import KyivClock from "@/components/header/KyivClock";
import Menu from "@/components/header/Menu";
import { scrollToAnchor } from "@/lib/anchor";

export default function Header() {
  const [open, setOpen] = useState(false);
  const menuBtn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <header className="container-x fixed inset-x-0 top-0 z-50 text-(--fg) transition-colors duration-500">
        <div className="grid grid-cols-2 items-start pt-6 md:grid-cols-5">
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              scrollToAnchor("#top");
            }}
            className="flex items-center gap-2 text-ui font-bold tracking-tight whitespace-nowrap uppercase">
            {/* Orange keycap on dark, black keycap on the accent stage */}
            <span className="relative size-[2.2rem] shrink-0">
              <Image
                src="/img/logo.png"
                alt=""
                width={140}
                height={138}
                preload
                className="absolute inset-0 size-full transition-opacity duration-500 in-data-[stage=accent]:opacity-0"
              />
              <Image
                src="/img/logo--black.png"
                alt=""
                width={140}
                height={138}
                className="absolute inset-0 size-full opacity-0 transition-opacity duration-500 in-data-[stage=accent]:opacity-100"
              />
            </span>
            Yevhenii Tretyak
          </a>

          <span className="col-span-2 max-md:hidden" />

          <p className="label text-(--fg-muted) max-md:hidden">
            Kyiv, UA
            <br />
            <KyivClock />
          </p>

          <div className="flex items-start justify-end">
            <CornerButton
              ref={menuBtn}
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-haspopup="dialog"
            >
              Menu
            </CornerButton>
          </div>
        </div>
      </header>

      <Menu open={open} onClose={close} returnFocus={menuBtn} />
    </>
  );
}
