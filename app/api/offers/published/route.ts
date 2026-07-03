import { store } from "@/lib/pipeline/store";
import { RewardType } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Public feed: offers that operators have approved or published — these are the
 * "live" offers shown on the marketplace. Optional `?type=` filters by reward
 * type so an agent page can pull only its own offers.
 */
export async function GET(req: Request) {
  const type = new URL(req.url).searchParams.get("type");
  const all = await store.list();
  let offers = all.filter(
    (o) => o.status === "approved" || o.status === "published"
  );
  if (type) offers = offers.filter((o) => o.rewardType === (type as RewardType));
  // Published first, then approved; newest first within each.
  offers.sort((a, b) => {
    const rank = (s: string) => (s === "published" ? 0 : 1);
    if (rank(a.status) !== rank(b.status)) return rank(a.status) - rank(b.status);
    return (b.approvedAt ?? b.discoveredAt).localeCompare(a.approvedAt ?? a.discoveredAt);
  });
  return Response.json({ offers });
}
