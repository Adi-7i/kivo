import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { UserProfile } from "@/features/auth/api";
import { User, Mail, Globe, Lock, ShieldCheck } from "lucide-react";

export function ProfileInfoSection({ user }: { user: UserProfile }) {
  return (
    <div className="space-y-6">
      {/* Account Credentials / Personal Information */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <User className="size-4 text-kivo-primary" />
            <CardTitle className="text-base font-bold">Personal Information</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Identity details managed by the primary Django authentication layer.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 text-left">
              <Label htmlFor="profile-name" className="text-xs font-semibold text-foreground">
                Full Name
              </Label>
              <Input
                id="profile-name"
                value={user.name}
                disabled
                className="bg-muted/40 cursor-not-allowed"
              />
              <span className="text-[10px] text-muted-foreground">
                Synchronized with authenticated User model.
              </span>
            </div>

            <div className="space-y-1.5 text-left">
              <Label htmlFor="profile-email" className="text-xs font-semibold text-foreground">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="profile-email"
                  value={user.email}
                  disabled
                  className="bg-muted/40 cursor-not-allowed pr-10"
                />
                <Mail className="size-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <span className="text-[10px] text-muted-foreground">
                Primary identifier for session verification.
              </span>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled
              title="Profile updates are not currently supported"
              className="text-xs"
            >
              Update Profile Details
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Regional & Financial Preferences */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-kivo-primary" />
            <CardTitle className="text-base font-bold">Regional & Currency Standards</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Strict integer paise and calendar calculation settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Currency</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-bold border-kivo-sage text-kivo-brand-dark dark:text-kivo-sage"
                >
                  INR (₹) &bull; Paise Integer
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Multi-currency is intentionally deferred to protect mathematical exactness.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Timezone</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium border-border text-foreground"
                >
                  Asia/Kolkata (IST)
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Daily ledger reconciliation adheres to Indian Standard Time (UTC+05:30).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security & Auditability */}
      <Card className="border-border shadow-xs bg-card">
        <CardHeader className="border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Lock className="size-4 text-kivo-primary" />
            <CardTitle className="text-base font-bold">Security & Audit Trail</CardTitle>
          </div>
          <CardDescription className="text-xs text-muted-foreground">
            Identity protection and immutable session tracking.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-finance-income" />
              <div>
                <p className="font-semibold text-foreground">Password Authentication</p>
                <p className="text-[11px] text-muted-foreground">
                  Your password is securely managed by the authentication service.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="xs"
              disabled
              title="Password changes are not currently supported"
              className="text-xs"
            >
              Change Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
