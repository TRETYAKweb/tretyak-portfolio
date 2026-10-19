import Header from "@/components/Header";
import GridLines from "@/components/GridLines";
import CursorProgress from "@/components/CursorProgress";
import Hero from "@/components/Hero";
import Stats from "@/components/Stats";

export default function Home() {
  return (
    <>
      <GridLines />
      <Header />
      <CursorProgress />
      <main>
        <Hero />
        <Stats />
      </main>
    </>
  );
}
