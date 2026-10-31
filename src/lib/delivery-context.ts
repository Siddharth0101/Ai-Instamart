import type { AssistantView } from "./assistant-contracts";
import type { Address, SessionView } from "./contracts";

/** A Food address cannot describe a grocery bag that Instamart kept at another address. */
export function deliveryContext(view: AssistantView | null, session: Pick<SessionView, "addresses" | "addressId"> | null, foodAddresses: Address[], foodAddressId: string | null) {
  const foodConnected = view?.providers.some(provider => provider.id === "swiggy_food" && provider.status === "connected");
  const instamart = (!view?.restaurantBrowser && view?.task.discovery?.kind === "snacks") || !foodConnected;
  const addresses = instamart ? session?.addresses ?? [] : foodAddresses;
  const selectedId = instamart ? session?.addressId ?? null : foodAddressId;
  return { instamart, addresses, selectedId, selected: addresses.find(address => address.id === selectedId) ?? null };
}
