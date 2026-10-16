"use client";
import { useCart } from "@/components/commerce/cart-provider";
import { SearchResults, type SearchParams } from "./search-results";
export function SearchPreview({ params }: { params: SearchParams }) {
  const { catalog, imageUrls } = useCart();
  return (
    <SearchResults
      catalog={catalog}
      params={params}
      imageUrls={imageUrls}
      preview
    />
  );
}
