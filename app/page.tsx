import Header from "@/components/header/Header";
import GridLines from "@/components/layout/GridLines";
import Cursor from "@/components/layout/Cursor";
import Hero from "@/components/hero/Hero";
import Stats from "@/components/stats/Stats";
import Work from "@/components/work/Work";

export default function Home() {
  return (
    <>
      <GridLines />
      <Header />
      <Cursor />
      <main>
        <Hero />
        {/* Stats sticks inside this wrapper while Work runs over it on desktop */}
        <div>
          <Stats />
          <Work />
        </div>
        {/* TODO: next section (Worked At); for now just the black it lands on */}
        <section aria-hidden className="h-svh bg-black" />
      </main>
    </>
  );
}
