// Same loose check as the backend (lib/league phoneError) — people write numbers as
// "0740 123 456", "+40 740-123-456", ….
export function phoneError(phone: string): string | null {
    const digits = phone.replace(/\D/g, "");
    if (!/^\+?[\d\s().-]+$/.test(phone)) return "A phone number can only have digits, spaces, +, -, ( and )";
    if (digits.length < 6 || digits.length > 15) return "That doesn’t look like a phone number";
    return null;
}
