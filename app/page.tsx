import MaatuApp from "./components/MaatuApp";
import { JsonLd } from "./components/JsonLd";
import { homeGraph } from "@/lib/structured-data";

export default function Home() {
  return (
    <>
      <JsonLd data={homeGraph()} />
      <MaatuApp />
    </>
  );
}
