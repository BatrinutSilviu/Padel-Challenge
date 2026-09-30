// "1" on a phone, "Team 1" from sm up — team rows need every pixel on a narrow screen.
export function TeamNumber({ index }: { index: number }) {
    return (
        <span className="text-xs sm:text-sm font-medium text-gray-500 w-5 sm:w-14 shrink-0 text-right sm:text-left tabular-nums">
            <span className="hidden sm:inline">Team </span>{index + 1}
        </span>
    );
}
