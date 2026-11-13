import { useState } from "react";

// The line a settings card shows after saving: a confirmation that clears itself after a
// few seconds, or an error that stays until the next try.
export function useFlashMessage(ms = 3000) {
    const [message, setMessage] = useState("");
    return {
        message,
        flash(text: string) {
            setMessage(text);
            setTimeout(() => setMessage(""), ms);
        },
        fail(error: { message: string }) {
            setMessage(`Error: ${error.message}`);
        },
    };
}
