// Small helpers shared by the login, sign-up and email-link pages.

// The machine-readable reason the backend gives some refusals (error.data.reason), e.g.
// EMAIL_NOT_VERIFIED when logging in before confirming the email.
export function errorReason(error: unknown): string | null {
    const reason = (error as { data?: { reason?: unknown } } | null)?.data?.reason;
    return typeof reason === "string" ? reason : null;
}

// Where to go after logging in: a path on this site only, never another site.
export function safeRedirect(redirect: string | null): string | null {
    return redirect && redirect.startsWith("/") && !redirect.startsWith("//") && !redirect.startsWith("/\\") ? redirect : null;
}

export const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FF4200]";
export const buttonClass = "w-full bg-[#FF4200] text-white rounded-lg px-4 py-3 text-base font-medium hover:bg-[#CC3500] disabled:opacity-50 transition-colors";
