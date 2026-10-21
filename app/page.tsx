import Header from "@/components/header/Header";
import GridLines from "@/components/layout/GridLines";
import Cursor from "@/components/layout/Cursor";
import Hero from "@/components/hero/Hero";
import Stats from "@/components/stats/Stats";

export default function Home() {
  return (
    <>
      <GridLines />
      <Header />
      <Cursor />
      <main>
        <Hero />
        <Stats />
      </main>
    </>
  );
}
