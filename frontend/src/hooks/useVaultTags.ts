import { useQuery } from '@tanstack/react-query';

export function useVaultTags() {
  return useQuery<string[]>({
    queryKey: ['vault-tags'],
    queryFn: async () => {
      const res = await fetch('/vault-tags');
      const data = await res.json();
      return data.tags as string[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
