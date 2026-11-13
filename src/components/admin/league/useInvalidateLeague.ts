import { trpc } from "../../../trpc";

// After changing a league: refetch it, the league list and its matches.
export function useInvalidateLeague() {
    const utils = trpc.useUtils();
    return () => {
        utils.league.getById.invalidate();
        utils.league.list.invalidate();
        utils.league.match.invalidate();
    };
}
