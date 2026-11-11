import { Link } from "react-router-dom";
import { NavBar } from "./NavBar";
import { trpc } from "../trpc";

// The privacy policy (GDPR), in Romanian — what the app actually stores and shows, who
// to write to, and the users' rights. The organisation's legal name and privacy email are
// set by an admin (site.privacy); until then the support contact stands in.

export function PrivacyPage() {
    const { data: privacy } = trpc.site.privacy.useQuery();
    const { data: contacts } = trpc.site.contacts.useQuery();
    const contact = contacts?.[0];
    const controller = privacy?.controller || "organizatorii comunității Act!ve Padel";
    const reach = privacy?.email
        ? <a href={`mailto:${privacy.email}`} className="text-[#FF4200] font-semibold">{privacy.email}</a>
        : contact?.phone
        ? <>telefon / WhatsApp <b>{contact.phone}</b>{contact.name ? ` (${contact.name})` : ""}</>
        : <>datele de contact afișate pe paginile turneelor</>;

    const h2 = "text-base font-black text-[#1A1A2E] mt-6 mb-2";
    return (
        <div className="min-h-screen bg-[#F5F5F7]">
            <NavBar />
            <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
                <article className="bg-white rounded-2xl border border-[#E5E5EA] p-5 sm:p-8 shadow-sm text-sm text-[#3A3A4E] leading-relaxed">
                    <h1 className="text-2xl font-black text-[#1A1A2E]">Politica de confidențialitate</h1>
                    <p className="text-xs text-[#8E8E93] mt-1">Privacy policy · în vigoare din 11 noiembrie 2026</p>

                    <p className="mt-4">
                        Aplicația Act!ve Padel organizează turneele, clasamentele și liga comunității. Operatorul datelor tale personale
                        este <b>{controller}</b>. Pentru orice întrebare sau cerere privind datele tale ne poți contacta la {reach}.
                    </p>

                    <h2 className={h2}>Ce date folosim</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><b>Contul tău:</b> adresa de email și parola (păstrată doar criptată), sau identificatorul contului Google dacă te conectezi cu Google.</li>
                        <li><b>Profilul de jucător:</b> numele, sexul și divizia (nivelul).</li>
                        <li><b>Activitatea sportivă:</b> înscrierile la turnee, partenerii, scorurile, locurile obținute, ratingul (ELO), punctele de clasament și insignele.</li>
                        <li><b>Date pe care alegi să le completezi:</b> numărul de telefon, când și unde preferi să joci și o notă — folosite pentru programarea meciurilor din ligă.</li>
                        <li><b>Plăți:</b> doar dacă ai achitat taxa sau avansul (confirmarea locului). Plata se face direct în contul nostru; aplicația nu vede și nu păstrează datele cardului sau ale contului tău bancar.</li>
                        <li><b>Acordul tău:</b> data la care ai acceptat această politică.</li>
                    </ul>

                    <h2 className={h2}>De ce și pe ce bază</h2>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Ca să organizăm turneele și liga la care te înscrii (înscriere, tragere la sorți, programul meciurilor, rezultate) — pe baza acordului tău, dat la crearea contului.</li>
                        <li>Ca să publicăm rezultatele și clasamentele comunității — tot pe baza acordului tău.</li>
                        <li>Ca să păstrăm evidența taxelor încasate — obligație legală și interes legitim.</li>
                    </ul>

                    <h2 className={h2}>Ce este public</h2>
                    <p>
                        Numele, divizia, rezultatele, clasamentele și insignele jucătorilor sunt vizibile pe site pentru oricine. Emailul nu este
                        afișat niciodată. Numărul de telefon este arătat doar jucătorilor cu care ai un meci programat în ligă.
                    </p>

                    <h2 className={h2}>Cui transmitem datele</h2>
                    <p>
                        Nu vindem și nu închiriem datele tale. Ele sunt găzduite pe serverul nostru, la un furnizor de găzduire. Dacă te conectezi
                        cu Google, Google confirmă identitatea ta. Aplicația internă de administrare a comunității primește datele turneelor
                        (data, ora, locația, taxa, numărul de jucători confirmați), fără date personale ale jucătorilor.
                    </p>

                    <h2 className={h2}>Cât timp le păstrăm</h2>
                    <p>
                        Datele contului le păstrăm cât timp ai cont. Rezultatele sportive fac parte din istoricul turneelor și rămân și după
                        închiderea contului; la cerere, îți putem anonimiza numele din acest istoric.
                    </p>

                    <h2 className={h2}>Drepturile tale</h2>
                    <p>Conform GDPR (Regulamentul UE 2016/679), ai dreptul:</p>
                    <ul className="list-disc pl-5 space-y-1 mt-1">
                        <li>să afli ce date avem despre tine și să primești o copie a lor;</li>
                        <li>să le corectezi (numele, divizia sau sexul greșite le corectăm la cerere);</li>
                        <li>să ceri ștergerea contului și anonimizarea numelui din rezultate;</li>
                        <li>să restricționezi prelucrarea sau să te opui ei;</li>
                        <li>să îți retragi oricând acordul, fără a afecta ce s-a făcut înainte;</li>
                        <li>să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (<a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-[#FF4200] font-semibold">www.dataprotection.ro</a>).</li>
                    </ul>
                    <p className="mt-2">Pentru oricare dintre acestea scrie-ne la {reach}. Răspundem în cel mult o lună.</p>

                    <h2 className={h2}>Cookie-uri</h2>
                    <p>
                        Nu folosim cookie-uri de urmărire sau de publicitate. Browserul tău păstrează doar datele necesare ca să rămâi conectat.
                    </p>

                    <p className="mt-6">
                        <Link to="/" className="text-[#FF4200] font-semibold">← Înapoi la pagina principală</Link>
                    </p>
                </article>
            </main>
        </div>
    );
}

// The consent checkbox: required to create an account, and asked once of older accounts
// before they join a tournament.
export function PrivacyConsent({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
    return (
        <label className="flex items-start gap-2.5 text-sm text-[#3A3A4E]">
            <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="mt-0.5 w-4 h-4 shrink-0 accent-[#FF4200]" />
            <span>
                I agree to the processing of my personal data as described in the{" "}
                <Link to="/privacy" target="_blank" className="text-[#FF4200] font-semibold underline">privacy policy</Link>
                {" "}(GDPR), including showing my name and results publicly on the site.
            </span>
        </label>
    );
}
