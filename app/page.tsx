import Header from "@/components/Header";
import GridLines from "@/components/GridLines";
import Cursor from "@/components/Cursor";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";

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
