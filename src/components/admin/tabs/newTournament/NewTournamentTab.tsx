import { useState } from "react";
import { CreateTournamentForm } from "./CreateTournamentForm";
import { ImportRankedinForm } from "./ImportRankedinForm";

// A new tournament: set up here, or imported (finished, with its scores) from Rankedin.
export function NewTournamentTab({ onCreated }: { onCreated: () => void }) {
    const [mode, setMode] = useState<"create" | "import">("create");
    if (mode === "import") return <ImportRankedinForm onImported={onCreated} onBack={() => setMode("create")} />;
    return <CreateTournamentForm onCreated={onCreated} onImport={() => setMode("import")} />;
}
