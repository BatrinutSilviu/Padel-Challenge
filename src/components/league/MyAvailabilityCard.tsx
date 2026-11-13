import { Link } from "react-router-dom";
import { trpc } from "../../trpc";
import { DAY_LABELS, formatRange, rangesByDay } from "../../lib/league";

// The logged-in player's phone number, hours and clubs, shown on the league pages so
// it's hard to miss: an orange call to action while something is missing, otherwise a
// summary with an edit link.
export function MyAvailabilityCard() {
    const { data: profile } = trpc.profile.me.useQuery();
    if (!profile) return null;

    const noPhone = !profile.phone;
    const noHours = profile.availability.length === 0;

    if (noPhone || noHours) {
        const what = noPhone && noHours ? "your phone number and the hours you can play"
            : noPhone ? "your phone number" : "the hours you can play";
        return (
            <section className="bg-[#FF4200] rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
                <div className="min-w-0">
                    <p className="font-black text-white">{noPhone ? "📞 Your opponents can't reach you yet" : "🕒 Let your opponents know when you can play"}</p>
                    <p className="text-sm text-white/85">
                        Add {what} so the other teams can arrange your matches with you.
                    </p>
                </div>
                <Link to="/league/availability" className="shrink-0 text-center text-sm font-bold px-5 py-3 rounded-xl bg-white text-[#FF4200] hover:bg-white/90">
                    Add my contact & availability
                </Link>
            </section>
        );
    }

    return (
        <section className="bg-white rounded-2xl border-2 border-[#333366]/15 p-4 sm:p-5 shadow-sm space-y-2">
            <div className="flex items-center justify-between gap-3">
                <h2 className="font-black text-[#1A1A2E]">My contact & availability</h2>
                <Link to="/league/availability" className="shrink-0 text-sm font-bold px-4 py-2 rounded-xl bg-[#333366] text-white hover:bg-[#3D3D75]">
                    Edit
                </Link>
            </div>
            <p className="text-sm text-[#1A1A2E]">📞 {profile.phone} <span className="text-xs text-[#8E8E93]">· only your league opponents see it</span></p>
            <div className="flex flex-wrap gap-1">
                {rangesByDay(profile.availability).map(([day, rs]) => (
                    <span key={day} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#333366]/10 text-[#333366] tabular-nums">
                        {DAY_LABELS[day]} {rs.map(formatRange).join(", ")}
                    </span>
                ))}
                {profile.venues.map(v => (
                    <span key={v} className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#F5F5F7] text-[#3A3A4E]">📍 {v}</span>
                ))}
            </div>
        </section>
    );
}
