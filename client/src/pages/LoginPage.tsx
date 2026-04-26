import { useState } from "react";
import { useAuth } from "../App";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await apiRequest("POST", "/api/auth/login", { email, password });
      login(data.user);
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(215,60%,18%)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <svg width="44" height="44" viewBox="0 0 48 48" fill="none" aria-label="Site Smart logo">
              {/* Ground */}
              <rect x="2" y="45" width="44" height="2" rx="1" fill="hsl(38,95%,52%)" opacity="0.4"/>
              {/* High-rise building — tall and narrow on left */}
              <rect x="4" y="10" width="18" height="35" rx="1" fill="hsl(38,95%,52%)"/>
              <rect x="5" y="11" width="16" height="33" rx="0.5" fill="hsl(215,60%,24%)"/>
              {/* Windows row 1 */}
              <rect x="7" y="13" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.95"/>
              <rect x="13" y="13" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.95"/>
              {/* Windows row 2 */}
              <rect x="7" y="18" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.85"/>
              <rect x="13" y="18" width="4" height="3" rx="0.3" fill="white" opacity="0.35"/>
              {/* Windows row 3 */}
              <rect x="7" y="23" width="4" height="3" rx="0.3" fill="white" opacity="0.35"/>
              <rect x="13" y="23" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.85"/>
              {/* Windows row 4 */}
              <rect x="7" y="28" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.7"/>
              <rect x="13" y="28" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.7"/>
              {/* Windows row 5 */}
              <rect x="7" y="33" width="4" height="3" rx="0.3" fill="hsl(38,95%,68%)" opacity="0.55"/>
              <rect x="13" y="33" width="4" height="3" rx="0.3" fill="white" opacity="0.3"/>
              {/* Door */}
              <rect x="10" y="40" width="4" height="4" rx="0.3" fill="hsl(215,60%,18%)"/>
              {/* Tower crane mast — tall column on right */}
              <rect x="33" y="5" width="4" height="40" rx="0.5" fill="hsl(38,95%,52%)"/>
              {/* Crane jib — long arm sweeping left over building */}
              <rect x="10" y="5" width="27" height="3" rx="0.5" fill="hsl(38,95%,52%)"/>
              {/* Crane counter-jib — shorter arm right */}
              <rect x="37" y="5" width="8" height="3" rx="0.5" fill="hsl(38,80%,42%)"/>
              {/* Crane cab */}
              <rect x="30" y="3" width="8" height="6" rx="0.5" fill="hsl(38,70%,36%)"/>
              {/* Hoist rope */}
              <line x1="16" y1="8" x2="16" y2="18" stroke="white" strokeWidth="1.2" opacity="0.9"/>
              {/* Hook */}
              <rect x="14" y="17" width="4" height="3" rx="0.5" fill="white" opacity="0.8"/>
              {/* Mast brace diagonals */}
              <line x1="35" y1="12" x2="24" y2="8" stroke="hsl(38,95%,52%)" strokeWidth="1" opacity="0.55"/>
              <line x1="35" y1="12" x2="44" y2="8" stroke="hsl(38,95%,52%)" strokeWidth="1" opacity="0.55"/>
            </svg>
            <span className="text-2xl font-bold text-white tracking-tight">Site Smart</span>
          </div>
          <p className="text-sm text-white/50">powered by TrustShyft™</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-2xl p-8 space-y-5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Sign in</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter your credentials to continue</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              data-testid="input-email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              data-testid="input-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading} data-testid="button-login">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
          </Button>
        </form>
      </div>
    </div>
  );
}
