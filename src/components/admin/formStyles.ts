// Tailwind classes shared by the admin forms, so every input and choice looks the same.

// A full-width text field. 16px on phones: iOS zooms the page into any smaller input on focus.
export const field = "border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full";

// The admin dashboard's compact field: full width on a phone, as wide as its content above that.
export const compactField = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full sm:w-auto";

// One of a row of buttons that pick a single value (a level, a type, a number); the chosen one is filled in.
export function choiceClass(selected: boolean): string {
    return `px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
        selected ? "bg-[#FF4200] text-white border-[#FF4200]" : "border-gray-300 text-gray-600 hover:border-[#FF4200]"
    }`;
}
