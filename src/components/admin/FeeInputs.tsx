// The price per person in lei, and the advance that's paid up front to confirm a spot
// (part of the price). Both are optional.
export function FeeInputs({ entryFee, advanceFee, onEntryFee, onAdvanceFee, disabled }: {
    entryFee: string;
    advanceFee: string;
    onEntryFee: (value: string) => void;
    onAdvanceFee: (value: string) => void;
    disabled?: boolean;
}) {
    const input = (label: string, hint: string, value: string, onChange: (value: string) => void) => (
        <label className="flex-1 sm:flex-none">
            <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
            <input
                type="number"
                min={0}
                inputMode="numeric"
                value={value}
                onChange={e => onChange(e.target.value)}
                disabled={disabled}
                placeholder="Optional"
                // 16px on phones: iOS zooms the page into any smaller input on focus.
                className="border border-gray-300 rounded-lg px-3 py-2 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4200] bg-white w-full sm:w-32 disabled:opacity-50"
            />
            <span className="block text-xs text-gray-400 mt-1">{hint}</span>
        </label>
    );
    return (
        <div className="flex gap-3">
            {input("Total price", "Per person, in lei", entryFee, onEntryFee)}
            {input("Advance", "Paid to confirm the spot", advanceFee, onAdvanceFee)}
        </div>
    );
}
