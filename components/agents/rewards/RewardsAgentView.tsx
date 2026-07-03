"use client";

import { useState, useMemo, useEffect } from "react";
import { RewardOffer, RewardType } from "@/lib/types";
import {
  getOffersByType,
  rewardCategories,
  formatOfferEnds,
} from "@/lib/data/rewards";
import { DiscoveredOffer } from "@/lib/pipeline/types";
import ResultCard from "@/components/ui/ResultCard";
import StatusBar from "@/components/ui/StatusBar";
import AgentAssistant from "@/components/ui/AgentAssistant";

interface RewardsAgentViewProps {
  type: RewardType;
  icon: string;
  /** Contextual banner shown above the filters. */
  intro: string;
  actionLabel: string;
  chat: {
    title: string;
    placeholder: string;
    quickAsks: string[];
    systemContext: string;
  };
}

/** Short value badge shown on each card, tailored to the reward type. */
function primaryValue(offer: RewardOffer): string {
  if (offer.type === "cashback" && offer.cashbackPercent != null)
    return `${offer.cashbackPercent}% back`;
  if (offer.type === "loyalty" && offer.pointsRequired != null)
    return `${offer.pointsRequired.toLocaleString()} pts`;
  if (offer.salePrice != null) return `$${offer.salePrice}`;
  if (offer.discountPercent != null) return `${offer.discountPercent}% off`;
  return "Reward";
}

function metaFor(offer: RewardOffer): string[] {
  const meta: string[] = [offer.category];

  if (offer.type === "cashback" && offer.cashbackPercent != null) {
    meta.push(`${offer.cashbackPercent}% cashback`);
  } else if (offer.type === "loyalty") {
    if (offer.pointsValue) meta.push(offer.pointsValue);
  } else if (offer.type === "promo-code" && offer.promoCode) {
    meta.push(`Code: ${offer.promoCode}`);
  } else if (offer.type === "bogo" && offer.bogoDetail) {
    meta.push(offer.bogoDetail);
  } else if (offer.discountPercent != null) {
    meta.push(`${offer.discountPercent}% off`);
  }

  if (offer.minSpend) meta.push(`Min $${offer.minSpend}`);
  meta.push(`Ends ${formatOfferEnds(offer.endsAt)}`);
  return meta;
}

export default function RewardsAgentView({
  type,
  icon,
  intro,
  actionLabel,
  chat,
}: RewardsAgentViewProps) {
  const [category, setCategory] = useState("All");
  const [brand, setBrand] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantPrompt, setAssistantPrompt] = useState<string | undefined>();

  const openAssistant = (prompt?: string) => {
    setAssistantPrompt(prompt);
    setAssistantOpen(true);
  };

  const [liveOffers, setLiveOffers] = useState<DiscoveredOffer[]>([]);
  useEffect(() => {
    let active = true;
    fetch(`/api/offers/published?type=${encodeURIComponent(type)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.offers) setLiveOffers(data.offers as DiscoveredOffer[]);
      })
      .catch(() => {
        /* no backend (static demo) — hide */
      });
    return () => {
      active = false;
    };
  }, [type]);

  const offers = useMemo(() => getOffersByType(type), [type]);

  const filtered = useMemo(() => {
    return offers.filter((o) => {
      if (category !== "All" && o.category !== category) return false;
      if (featuredOnly && !o.featured) return false;
      if (brand) {
        const q = brand.toLowerCase();
        if (
          !o.brand.toLowerCase().includes(q) &&
          !o.title.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [offers, category, brand, featuredOnly]);

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-3.5 text-sm text-emerald-200 bg-emerald-500/10 border border-emerald-400/20">
        {intro}
      </div>

      <div className="glass-panel p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input-modern"
          >
            {rewardCategories.map((c) => (
              <option key={c} value={c}>
                {c === "All" ? "All Categories" : c}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Brand or keyword"
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="input-modern"
          />
          <label className="inline-flex items-center gap-2 text-sm text-slate-300 px-1">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 text-emerald-500 focus:ring-emerald-500"
            />
            Featured only
          </label>
          <button
            onClick={() => {
              setIsSearching(true);
              setTimeout(() => setIsSearching(false), 400);
            }}
            className="btn-primary"
          >
            {actionLabel}
          </button>
        </div>
        <StatusBar
          status={isSearching ? "thinking" : "idle"}
          message={`${filtered.length} offers found`}
        />
      </div>

      {liveOffers.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">
              Live offers
              <span className="ml-2 text-xs font-normal text-slate-400">{liveOffers.length}</span>
            </h3>
            <span className="badge-pill bg-emerald-500/15 text-emerald-300 border-emerald-400/25">
              Approved by operators
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {liveOffers.map((o) => (
              <ResultCard
                key={o.id}
                icon={icon}
                title={o.title}
                subtitle={`${o.merchant}${o.country ? ` · ${o.country}` : ""}`}
                price={o.discountText ?? "Offer"}
                meta={[
                  o.category,
                  ...(o.promoCode ? [`Code: ${o.promoCode}`] : []),
                  o.status === "published" ? "Published" : "Approved",
                ]}
                availability="available"
                actionLabel={actionLabel}
                onAction={() => window.open(o.url, "_blank")}
                onDetails={() =>
                  openAssistant(
                    `Explain this ${type.replace("-", " ")} offer and whether it's worth using: "${o.title}" from ${o.merchant} in ${o.country}. ${o.description}${o.promoCode ? ` Promo code: ${o.promoCode}.` : ""}`
                  )
                }
              />
            ))}
          </div>
        </section>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map((o) => (
          <ResultCard
            key={o.id}
            icon={icon}
            title={o.title}
            subtitle={`${o.brand}${o.city ? ` · ${o.city}` : ""}`}
            price={primaryValue(o)}
            meta={metaFor(o)}
            availability={o.availability}
            actionLabel={actionLabel}
            onAction={() => window.open(o.url, "_blank")}
            onDetails={() =>
              openAssistant(
                `Explain this ${type.replace("-", " ")} offer and whether it's worth using: "${o.title}" from ${o.brand}. ${o.description}${
                  o.promoCode ? ` Promo code: ${o.promoCode}.` : ""
                }${o.minSpend ? ` Minimum spend $${o.minSpend}.` : ""} Ends ${formatOfferEnds(o.endsAt)}.`
              )
            }
            onAlternatives={() =>
              openAssistant(
                `Find similar ${o.category} ${type.replace("-", " ")} offers${o.city ? ` in ${o.city}` : ""} that are as good or better than ${o.brand}'s "${o.title}".`
              )
            }
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="empty-state">No offers match your filters.</div>
      )}

      <button
        onClick={() => openAssistant()}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/20 bg-gradient-to-br from-hub-blue to-hub-purple hover:opacity-90 transition-opacity"
      >
        <span className="text-base">✨</span>
        Ask {chat.title}
      </button>

      <AgentAssistant
        open={assistantOpen}
        onClose={() => setAssistantOpen(false)}
        agentName={chat.title}
        icon={icon}
        placeholder={chat.placeholder}
        quickAsks={chat.quickAsks}
        systemContext={chat.systemContext}
        initialPrompt={assistantPrompt}
      />
    </div>
  );
}
