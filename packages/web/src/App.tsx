import { Link, Route, Routes } from "react-router-dom";
import TournamentListPage from "./pages/TournamentListPage.js";
import TournamentCreatePage from "./pages/TournamentCreatePage.js";
import TournamentDetailPage from "./pages/TournamentDetailPage.js";

export default function App() {
  return (
    <div>
      <header className="topbar">
        <Link to="/">Turnierverwaltung</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<TournamentListPage />} />
          <Route path="/turniere/neu" element={<TournamentCreatePage />} />
          <Route path="/turniere/:id" element={<TournamentDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}
