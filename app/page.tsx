import Hero from "@/components/Hero";
import StatePicker from "@/components/StatePicker";

// S-01 Welcome
export default async function Welcome(props: PageProps<"/">) {
  const { state } = await props.searchParams;
  return (
    <>
      <Hero returning={state === "returning"} />
      <StatePicker base="/" current={state as string} states={[["", "First Visit"], ["returning", "Keys Already in This Browser"]]} />
    </>
  );
}
