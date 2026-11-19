import { useLevelRules } from "../lib/levels";

// What the * after a level coefficient means.
export function ProvisionalNote() {
    const rules = useLevelRules();
    const n = rules.data?.levels.provisionalMatches ?? 10;
    return (
        <p>
            * Provisional coefficient: fewer than {n} rated matches so far, so it still moves quickly.
            It goes away after the player's {n}th rated match.
        </p>
    );
}
