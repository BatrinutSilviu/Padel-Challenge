import {AuthPage} from "./components/AuthPage";
import {Home} from "./components/Home";
import { Routes, Route } from "react-router-dom";

export default function App() {
    return (
        <Routes>
            <Route path="/home" element={<Home/>} />
            <Route path="/login" element={<AuthPage />} />
        </Routes>
    );
}
