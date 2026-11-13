// Which player profile an account plays as: one an admin already created (with its
// tournament history — claimed, and linked once an admin approves), or a new one.
export type Identity =
    | { mode: "existing"; playerId: string; name: string }
    | { mode: "new"; name: string };

// What the backend expects for the chosen identity.
export function identityInput(identity: Identity) {
    return identity.mode === "existing"
        ? { mode: "existing" as const, playerId: identity.playerId }
        : { mode: "new" as const, name: identity.name };
}
