import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { NavBar } from "../NavBar";
import { trpc } from "../../trpc";
import { useAuth } from "../../contexts/useAuth";
import { ProfileStep } from "./ProfileStep";
import { identityInput } from "./identity";

// For a logged-in account that doesn't play as a player yet: its claim on an existing
// profile is waiting for an admin, or was rejected. Renders nothing otherwise.
export function AccountStatusNotice({ className = "" }: { className?: string }) {
    const { account } = useAuth();
    if (!account || account.playerId) return null;

    const claim = account.claim;
    if (claim?.status === "PENDING") {
        return (
            <div className={`bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3.5 ${className}`}>
                <p className="text-sm font-bold text-amber-700">Your profile claim is waiting for admin approval</p>
                <p className="text-sm text-amber-700/80 mt-0.5">
                    You asked to be linked to <span className="font-semibold">{claim.player.name}</span>. Until an admin
                    confirms it's you, you can look around but not sign up for tournaments or record matches.
                </p>
            </div>
        );
    }
    return (
        <div className={`bg-red-50 border border-red-200 rounded-2xl px-4 py-3.5 ${className}`}>
            <p className="text-sm font-bold text-red-600">
                {claim?.status === "REJECTED" ? "Your profile claim wasn't approved" : "Your account has no player profile yet"}
            </p>
            <p className="text-sm text-red-600/80 mt-0.5">
                {claim?.status === "REJECTED" && <>An admin couldn't confirm you're <span className="font-semibold">{claim.player.name}</span>. </>}
                Pick your profile again or create a new one to start playing.
            </p>
            <Link
                to="/account/profile"
                className="inline-block mt-2 text-sm font-bold px-4 py-2 rounded-xl bg-[#FF4200] text-white hover:bg-[#CC3500] transition-colors"
            >
                Choose my profile
            </Link>
        </div>
    );
}

// Picking a profile again, for an account whose claim was rejected.
export function ChooseProfilePage() {
    const navigate = useNavigate();
    const utils = trpc.useUtils();
    const { account } = useAuth();
    const [error, setError] = useState("");
    const choose = trpc.auth.chooseProfile.useMutation({
        onSuccess: data => {
            utils.auth.me.invalidate();
            toast.success(data.pendingApproval ? "Claim sent — an admin will confirm it soon." : "You're all set!");
            navigate("/");
        },
        onError: e => setError(e.message),
    });

    const blocked = !!account && (!!account.playerId || account.claim?.status === "PENDING");

    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <div className="flex items-center justify-center min-h-[calc(100vh-64px)] px-4 py-8">
                <div className="bg-white rounded-2xl border border-[#E5E5EA] p-8 w-full max-w-md space-y-5 shadow-sm">
                    <h1 className="text-xl font-black text-[#1A1A2E]">Choose your player profile</h1>
                    {!account ? (
                        <p className="text-sm text-gray-400">Loading…</p>
                    ) : blocked ? (
                        <>
                            <AccountStatusNotice />
                            {account.playerId && <p className="text-sm text-gray-600">Your account already plays as {account.player?.name}.</p>}
                            <Link to="/" className="text-sm text-[#FF4200] font-semibold hover:underline">Back to the home page</Link>
                        </>
                    ) : (
                        <>
                            <ProfileStep onChoose={identity => { setError(""); choose.mutate({ player: identityInput(identity) }); }} />
                            {choose.isPending && <p className="text-sm text-gray-400">Saving…</p>}
                            {error && <p className="text-sm text-red-500">{error}</p>}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
