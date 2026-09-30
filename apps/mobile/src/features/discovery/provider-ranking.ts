export type DiscoverySort = "recent" | "jobs" | "rating";

export type RankableProvider = {
  providerId?: string;
  publicId?: string;
  name: string;
  jobs: number;
  rating: string;
  subscriptionPriority?: number;
  registeredAt?: string;
};

export type LeaderCycle = {
  seen: string[];
  leaderId?: string;
};

export function providerKey(provider: RankableProvider) {
  return provider.providerId || provider.publicId || provider.name;
}

function numericRating(provider: RankableProvider) {
  return provider.rating === "Nuevo" ? 0 : Number(provider.rating.replace(",", ".")) || 0;
}

function selectedMetric(provider: RankableProvider, sort: DiscoverySort) {
  if (sort === "jobs") return provider.jobs;
  if (sort === "rating") return numericRating(provider);
  return new Date(provider.registeredAt || 0).getTime();
}

export function compareProviderPriority(a: RankableProvider, b: RankableProvider, sort: DiscoverySort) {
  const subscriptionDifference = (b.subscriptionPriority || 0) - (a.subscriptionPriority || 0);
  if (subscriptionDifference) return subscriptionDifference;
  const metricDifference = selectedMetric(b, sort) - selectedMetric(a, sort);
  if (metricDifference) return metricDifference;
  return providerKey(a).localeCompare(providerKey(b), "es");
}

export function topTieKeys(providers: RankableProvider[], sort: DiscoverySort) {
  if (!providers.length) return [];
  const sorted = [...providers].sort((a, b) => compareProviderPriority(a, b, sort));
  const first = sorted[0];
  return sorted
    .filter((provider) =>
      (provider.subscriptionPriority || 0) === (first.subscriptionPriority || 0)
      && selectedMetric(provider, sort) === selectedMetric(first, sort),
    )
    .map(providerKey);
}

export function advanceLeaderCycle(previous: LeaderCycle | undefined, eligibleKeys: string[], random = Math.random): LeaderCycle {
  const uniqueKeys = [...new Set(eligibleKeys)];
  if (!uniqueKeys.length) return { seen: [] };
  if (uniqueKeys.length === 1) return { seen: uniqueKeys, leaderId: uniqueKeys[0] };

  const validSeen = (previous?.seen || []).filter((key) => uniqueKeys.includes(key));
  let candidates = uniqueKeys.filter((key) => !validSeen.includes(key));
  let nextSeen = validSeen;
  if (!candidates.length) {
    nextSeen = [];
    candidates = uniqueKeys.filter((key) => key !== previous?.leaderId);
  }
  const leaderId = candidates[Math.min(candidates.length - 1, Math.floor(random() * candidates.length))];
  return { seen: [...nextSeen, leaderId], leaderId };
}

export function rankProviders<T extends RankableProvider>(providers: T[], sort: DiscoverySort, leaderId?: string) {
  const sorted = [...providers].sort((a, b) => compareProviderPriority(a, b, sort));
  if (!leaderId) return sorted;
  const tied = topTieKeys(sorted, sort);
  if (!tied.includes(leaderId)) return sorted;
  const leaderIndex = sorted.findIndex((provider) => providerKey(provider) === leaderId);
  if (leaderIndex <= 0) return sorted;
  const [leader] = sorted.splice(leaderIndex, 1);
  sorted.unshift(leader);
  return sorted;
}
