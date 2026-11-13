import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { trpc } from "../../../trpc";

// After changing a league: refetch it, the league list and its matches.
export function useInvalidateLeague() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.getById) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.list) });
        qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.match) });
    };
}
