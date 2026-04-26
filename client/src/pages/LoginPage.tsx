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
            <svg width="36" height="36" viewBox="0 0 48 48" fill="none" aria-label="Site Smart logo">
              
      <rect x="4" y="43" width="40" height="2" rx="1" fill="hsl(38,95%,52%)" opacity="0.4"/>
      
      <rect x="8" y="14" width="22" height="29" rx="1" fill="hsl(38,95%,52%)"/>
      
      <rect x="9" y="15" width="20" height="27" rx="1" fill="hsl(215,60%,22%)"/>
      
      <rect x="11" y="17" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="17" y="17" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="23" y="17" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      
      <rect x="11" y="22" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="17" y="22" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      <rect x="23" y="22" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      
      <rect x="11" y="27" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      <rect x="17" y="27" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      <rect x="23" y="27" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.9"/>
      
      <rect x="11" y="32" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.7"/>
      <rect x="17" y="32" width="4" height="3" rx="0.5" fill="white" opacity="0.5"/>
      <rect x="23" y="32" width="4" height="3" rx="0.5" fill="hsl(38,95%,62%)" opacity="0.7"/>
      
      <rect x="16" y="37" width="6" height="6" rx="0.5" fill="hsl(215,60%,18%)"/>
      
      <rect x="35" y="8" width="3" height="35" rx="0.5" fill="hsl(38,95%,52%)"/>
      
      <rect x="10" y="8" width="28" height="2.5" rx="0.5" fill="hsl(38,95%,52%)"/>
      
      <rect x="38" y="8" width="6" height="2.5" rx="0.5" fill="hsl(38,95%,52%)"/>
      
      <rect x="33" y="6" width="7" height="5" rx="0.5" fill="hsl(38,80%,40%)"/>
      
      <line x1="20" y1="10.5" x2="20" y2="20" stroke="white" stroke-width="0.8" opacity="0.7"/>
      
      <path d="M18.5 20 Q18.5 22.5 20 22.5 Q21.5 22.5 21.5 20" stroke="white" stroke-width="0.8" fill="none" opacity="0.7"/>
      
      <rect x="40" y="10" width="3" height="4" rx="0.5" fill="hsl(215,60%,35%)"/>
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
