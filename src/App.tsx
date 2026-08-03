import { Routes, Route, Navigate } from "react-router-dom";
import { HomePage } from "./components/HomePage";
import { DivisionPage } from "./components/DivisionPage";
import { TournamentPage } from "./components/TournamentPage";
import { PlayerPage } from "./components/PlayerPage";
import { AdminPage } from "./components/admin/AdminPage";
import { AdminScoreEntry } from "./components/admin/AdminScoreEntry";
import { BadgesPage } from "./components/BadgesPage";
import { LoginPage } from "./components/auth/LoginPage";
import { SignupPage } from "./components/auth/SignupPage";
import { RequireAuth } from "./components/auth/RequireAuth";
import { RecordMatchPage } from "./components/matches/RecordMatchPage";
import { MatchesPage } from "./components/matches/MatchesPage";

export default function App() {
    return (
        <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/division/:id" element={<DivisionPage />} />
            <Route path="/tournament/:id" element={<TournamentPage />} />
            <Route path="/player/:id" element={<PlayerPage />} />
            <Route path="/badges" element={<BadgesPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/matches" element={<MatchesPage />} />
            <Route path="/matches/new" element={<RequireAuth><RecordMatchPage /></RequireAuth>} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/tournament/:id" element={<AdminScoreEntry />} />
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
