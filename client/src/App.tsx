import { useState, createContext, useContext } from "react";
import { Switch, Route, Router, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient, setAuthUserId } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import type { AuthUser } from "./lib/auth";

import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ProjectPage from "./pages/ProjectPage";
import ProgrammePage from "./pages/ProgrammePage";
import MaterialPage from "./pages/MaterialPage";
import PreStartPage from "./pages/PreStartPage";
import MeetingsPage from "./pages/MeetingsPage";
import AdminPage from "./pages/AdminPage";

// ── Auth context ──────────────────────────────────────────────────────────────
interface AuthContextType {
  user: AuthUser | null;
  login: (u: AuthUser) => void;
  logout: () => void;
}
export const AuthContext = createContext<AuthContextType>({ user: null, login: () => {}, logout: () => {} });
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);

  function login(u: AuthUser) {
    setUser(u);
    setAuthUserId(String(u.id));
    queryClient.clear();
  }
  function logout() {
    setUser(null);
    setAuthUserId(null);
    queryClient.clear();
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, login, logout }}>
        <Router hook={useHashLocation}>
          {!user ? (
            <LoginPage />
          ) : (
            <Switch>
              <Route path="/" component={DashboardPage} />
              <Route path="/projects/:id" component={ProjectPage} />
              <Route path="/projects/:id/programme" component={ProgrammePage} />
              <Route path="/projects/:id/materials" component={MaterialPage} />
              <Route path="/projects/:id/prestart" component={PreStartPage} />
              <Route path="/projects/:id/prestart/:mid" component={PreStartPage} />
              <Route path="/projects/:id/meetings" component={MeetingsPage} />
              <Route path="/projects/:id/meetings/:mid" component={MeetingsPage} />
              <Route path="/admin" component={AdminPage} />
              <Route>
                <div className="flex items-center justify-center h-screen text-muted-foreground">Page not found</div>
              </Route>
            </Switch>
          )}
        </Router>
        <Toaster />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}
