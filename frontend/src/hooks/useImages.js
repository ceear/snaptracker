import { useQuery } from '@tanstack/react-query';
import * as imagesApi from '@api/images.js';

export function useImages(params = {}) {
  return useQuery({
    queryKey: ['images', params],
    queryFn: () => imagesApi.getImages(params),
    keepPreviousData: true,
  });
}

export function useImageDetail(id) {
  return useQuery({
    queryKey: ['image', id],
    queryFn: () => imagesApi.getImageDetail(id),
    enabled: !!id,
  });
}

export function useImageDates(owner) {
  return useQuery({
    queryKey: ['imageDates', owner],
    queryFn: () => imagesApi.getImageDates(owner),
    enabled: !!owner,
    staleTime: 60_000,
  });
}

export function useOwners() {
  return useQuery({
    queryKey: ['owners'],
    queryFn: imagesApi.getOwners,
    staleTime: 60_000,
  });
}
