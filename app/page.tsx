import Header from "@/components/Header";
import GridLines from "@/components/GridLines";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";

export default function Home() {
  return (
    <>
      <GridLines />
      <Header />
      <main>
        <Hero />
        <Stats />
      </main>
    </>
  );
}
