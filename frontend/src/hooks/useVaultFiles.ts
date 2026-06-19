import { useQuery } from '@tanstack/react-query';

export function useVaultFiles() {
  return useQuery<string[]>({
    queryKey: ['vault-files'],
    queryFn: async () => {
      const res = await fetch('/vault-files');
      const data = await res.json();
      return data.files as string[];
    },
    staleTime: 5 * 60 * 1000,
  });
}
