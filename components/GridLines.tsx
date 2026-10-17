const MARKERS: Record<number, string[]> = {
  0: ["24%"],
  2: ["52%"],
  4: ["31%"],
  5: ["68%"],
};

/** Fixed 5-column guide grid with small markers, shared by every section. */
export default function GridLines() {
  return (
    <div aria-hidden className="container-x pointer-events-none fixed inset-0 z-30">
      <div className="relative h-full">
        {/* Desktop: 5 columns */}
        {Array.from({ length: 6 }, (_, i) => (
          <span
            key={i}
            className="absolute top-0 h-full w-px bg-(--line) transition-colors duration-500 max-md:hidden"
            style={{ left: `${i * 20}%` }}
          >
            {MARKERS[i]?.map((top) => (
              <i
                key={top}
                className="absolute -left-px h-1.5 w-[3px] bg-(--marker) transition-colors duration-500"
                style={{ top }}
              />
            ))}
          </span>
        ))}
        {/* Mobile: 2 columns */}
        {[0, 50, 100].map((left) => (
          <span
            key={left}
            className="absolute top-0 h-full w-px bg-(--line) transition-colors duration-500 md:hidden"
            style={{ left: `${left}%` }}
          />
        ))}
      </div>
    </div>
  );
}
