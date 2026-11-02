import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { toast } from "sonner";
import { NavBar } from "./NavBar";
import { trpc } from "../trpc";
import { ProfileForm } from "./ProfileForm";

export function ProfilePage() {
    const qc = useQueryClient();
    const { data: profile, isPending } = trpc.profile.me.useQuery();
    const update = trpc.profile.update.useMutation({
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.profile.me) });
            qc.invalidateQueries({ queryKey: getQueryKey(trpc.league.match) });
            toast.success("Profile saved");
        },
    });

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-xl mx-auto px-3 sm:px-4 py-6 sm:py-8 pb-24 sm:pb-8 space-y-4">
                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-6 shadow-sm space-y-1">
                    <h1 className="text-xl font-black text-[#1A1A2E]">My profile</h1>
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
