import type { ReactNode } from "react";
import { choiceClass } from "./formStyles";

// A labelled form field in the admin dashboard.
export function Field({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="space-y-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            {children}
        </div>
    );
}

// A button in a row of choices (see choiceClass); the chosen one is filled in.
export function ChoiceButton({ selected, onClick, children }: { selected: boolean; onClick: () => void; children: ReactNode }) {
    return (
        <button type="button" onClick={onClick} className={choiceClass(selected)}>
            {children}
        </button>
    );
}
