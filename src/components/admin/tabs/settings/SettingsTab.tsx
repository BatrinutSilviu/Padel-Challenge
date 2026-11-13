import { PaymentAccountsAdmin } from "./PaymentAccountsAdmin";
import { SupportContactsAdmin } from "./SupportContactsAdmin";
import { PrivacyAdmin } from "./PrivacyAdmin";
import { DivisionDescriptionsAdmin } from "./DivisionDescriptionsAdmin";
import { RankingSystemSettings } from "./RankingSystemSettings";

// Everything that configures the site rather than a tournament or a player: where players
// pay, who they contact, the privacy policy's details and how players are ranked.
export function SettingsTab() {
    return (
        <div className="space-y-6 max-w-3xl">
            <PaymentAccountsAdmin />
            <SupportContactsAdmin />
            <PrivacyAdmin />
            <DivisionDescriptionsAdmin />
            <RankingSystemSettings />
        </div>
    );
}
