import { currentExpert } from "@/lib/session";
import { Card, H } from "@/components/ui";
import { ModNav } from "@/components/ModNav";
import { EvolutionTabs } from "@/components/EvolutionTabs";
import { evolutionGrid, listCards, listLinks } from "@/lib/evolution/service";

export const dynamic = "force-dynamic";

export default async function EvolutionPage() {
  const { me } = await currentExpert();
  if (!me?.isModerator) return <Card><p>Moderator console. Choose “ACAPS moderator” in the persona switcher (top right).</p></Card>;
  const [cards, grid, links] = await Promise.all([listCards(me), evolutionGrid(me), listLinks(me)]);
  return (
    <div>
      <H sub="How a situation has evolved and how questions relate. Real ACAPS-recorded history, panel rounds released through the privacy floor, and links that only an analyst can draw.">Situation evolution</H>
      <ModNav here="/moderator/evolution" />
      <Card>
        <EvolutionTabs cards={cards} grid={grid} links={links} />
      </Card>
      <p className="mt-4 max-w-3xl text-xs text-stone-500">
        By design there is no automatic cascade detection and no correlation statistics between questions. At pilot scale they are not detectable, and a number would look like a finding. The recorded history of each risk is on its risk page, under the ACAPS analysis. Completion rate is an analyst judgement whose meaning has not been standardised, and is never shown as a probability.
      </p>
    </div>
  );
}
