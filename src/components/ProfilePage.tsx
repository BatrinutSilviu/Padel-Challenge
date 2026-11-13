import { toast } from "sonner";
import { Link } from "react-router-dom";
import { NavBar } from "./NavBar";
import { trpc } from "../trpc";
import { ProfileForm } from "./ProfileForm";

// League: the player's phone number and when and where they like to play, which their
// league opponents see to arrange matches. Lives under /league/availability.
export function ProfilePage() {
    const utils = trpc.useUtils();
    const { data: profile, isPending } = trpc.profile.me.useQuery();
    const update = trpc.profile.update.useMutation({
        onSuccess: () => {
            utils.profile.me.invalidate();
            utils.league.match.invalidate();
            toast.success("Saved");
        },
    });

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-4">
                <Link to="/league" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#8E8E93] hover:text-[#FF4200]">← League</Link>
                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-sm space-y-1">
                    <p className="text-xs font-bold uppercase tracking-widest text-[#FF4200]">League</p>
                    <h1 className="text-xl font-black text-[#1A1A2E]">My contact & availability</h1>
                    <p className="text-sm text-[#8E8E93]">
                        Help your league opponents find a time to play: your phone number, and when and where you like to play.
                    </p>
                </div>
                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-sm">
                    {isPending || !profile ? (
                        <p className="text-[#8E8E93]">Loading…</p>
                    ) : (
                        <ProfileForm
                            profile={profile}
                            pending={update.isPending}
                            error={update.error?.message}
                            onSubmit={p => update.mutate(p)}
                        />
                    )}
                </div>
            </main>
        </div>
    );
}
