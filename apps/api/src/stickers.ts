// Limits the inventory held by one checkout while allowing arbitrary boleto counts.
export function validStickerQuantity(quantity: number, numbersPerSticker: number) {
  return Number.isInteger(quantity) && quantity > 0 && quantity <= 100 &&
    Number.isInteger(numbersPerSticker) && numbersPerSticker > 0 &&
    quantity % numbersPerSticker === 0;
}

export function purchaseOffer(campaign: {
  numbersPerSticker: number | null; priceCrc: number;
  packages: { quantity: number; priceCrc: number }[];
}, quantity: number) {
  if (campaign.numbersPerSticker) {
    if (!validStickerQuantity(quantity, campaign.numbersPerSticker)) return undefined;
    if (campaign.packages.length) return campaign.packages.find(item => item.quantity === quantity);
    const priceCrc = quantity / campaign.numbersPerSticker * campaign.priceCrc;
    // Includes headroom for the optional inverted purchase in a PostgreSQL Int.
    return priceCrc <= 1_000_000_000 ? { quantity, priceCrc } : undefined;
  }
  return campaign.packages.length
    ? campaign.packages.find(item => item.quantity === quantity)
    : quantity === 1 ? { quantity, priceCrc: campaign.priceCrc } : undefined;
}
