import { getTranslations } from "next-intl/server";
import {
  CalendarCheck,
  LockKey,
  Medal,
  Heart,
} from "@phosphor-icons/react/ssr";
import { Container } from "@/components/ui/Container";
import { FeatureItem } from "@/components/ui/FeatureItem";

const ICONS = [CalendarCheck, LockKey, Medal, Heart];

export async function FeaturesStrip() {
  const t = await getTranslations("Home");
  const features = t.raw("features") as Array<{
    title: string;
    description: string;
  }>;

  return (
    <section className="bg-page py-[clamp(60px,7vw,100px)]">
      <Container>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-[clamp(24px,3vw,44px)] border-t border-line-hair pt-[clamp(40px,4vw,56px)]">
          {features.map((f, i) => (
            <FeatureItem
              key={f.title}
              icon={ICONS[i] ?? Heart}
              title={f.title}
              description={f.description}
              iconSize={30}
            />
          ))}
        </div>
      </Container>
    </section>
  );
}
