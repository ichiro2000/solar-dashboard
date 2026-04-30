import { Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginAction } from "@/lib/auth-actions";

const ERRORS: Record<string, string> = {
  invalid: "Invalid password",
  missing_password: "Password is required",
  rate_limited: "Too many attempts. Try again in a minute.",
  server_misconfigured: "Server configuration error — check the env file.",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const errorMsg = searchParams.error ? ERRORS[searchParams.error] ?? null : null;

  return (
    <div className="grid min-h-screen place-items-center bg-background p-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 rounded-xl bg-primary/15 p-2 text-primary">
            <Sun className="size-5" />
          </div>
          <CardTitle>Solar Dashboard</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter the dashboard password to continue
          </p>
        </CardHeader>
        <CardContent>
          <form action={loginAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoFocus
                autoComplete="current-password"
                required
              />
            </div>
            {errorMsg && (
              <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {errorMsg}
              </p>
            )}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
