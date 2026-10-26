import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserRound,
  Save,
  Phone,
  Mail,
  Building2,
  Check,
  Copy,
  Shield,
  GraduationCap,
  Sparkles,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { saveProfile } from "@/lib/account.functions";

interface StudentProfileEditorProps {
  profile: {
    id: string;
    display_name: string;
    avatar_url?: string | null;
    phone_number?: string | null;
    bio?: string | null;
  };
  roles: string[];
  isPlatformAdmin?: boolean;
  selectedCompany?: { id: string; name: string; code: string } | null;
  onBrowseCompaniesClick?: () => void;
}

export function StudentProfileEditor({
  profile,
  roles,
  isPlatformAdmin,
  selectedCompany,
  onBrowseCompaniesClick,
}: StudentProfileEditorProps) {
  const queryClient = useQueryClient();

  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [phoneNumber, setPhoneNumber] = useState(profile.phone_number || "");
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url || "");
  const [bio, setBio] = useState(profile.bio || "");
  const [copiedId, setCopiedId] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setDisplayName(profile.display_name || "");
    setPhoneNumber(profile.phone_number || "");
    setAvatarUrl(profile.avatar_url || "");
    setBio(profile.bio || "");
  }, [profile]);

  const copyUserId = () => {
    void navigator.clipboard.writeText(profile.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const profileMutation = useMutation({
    mutationFn: () =>
      saveProfile({
        data: {
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim() || undefined,
          phone_number: phoneNumber.trim() || undefined,
          bio: bio.trim() || undefined,
        },
      }),
    onSuccess: () => {
      setSaveSuccess(true);
      void queryClient.invalidateQueries({ queryKey: ["account"] });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* 1. Student Personal Information Form */}
      <Card className="border border-border/80 rounded-2xl shadow-sm bg-card overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-muted/40 p-5 border-b border-border/70 flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-base shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={displayName} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              (displayName ? displayName.charAt(0) : "S").toUpperCase()
            )}
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">{displayName || "Student Scholar"}</h2>
            <p className="text-[11px] text-muted-foreground font-mono">
              Student ID: {profile.id.slice(0, 12)}…
            </p>
          </div>
        </div>

        <CardContent className="p-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              profileMutation.mutate();
            }}
            className="space-y-4 text-xs"
          >
            <div className="space-y-1">
              <label className="block font-semibold text-foreground">Full Display Name</label>
              <input
                required
                maxLength={100}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Kelvin Mutua"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-600" /> Phone Number (M-Pesa STK Push Prompts)
              </label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712345678"
                className="w-full font-mono rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <p className="text-[10px] text-muted-foreground">
                Used to deliver instant Lipa na M-Pesa PIN prompts when enrolling in company sessions.
              </p>
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-foreground">Avatar / Photo URL (Optional)</label>
              <input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder="https://example.com/photo.jpg"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-foreground">Personal Learning Bio / Statement</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Share your technical interests, career goals or study focus..."
                className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {saveSuccess && (
              <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Profile updated successfully!
              </p>
            )}

            {profileMutation.error && (
              <p className="text-xs text-destructive font-medium flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {profileMutation.error.message}
              </p>
            )}

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={profileMutation.isPending}
                className="bg-primary text-primary-foreground font-semibold text-xs"
              >
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {profileMutation.isPending ? "Saving Profile…" : "Save Student Profile"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* 2. Institutional Affiliation & Security */}
      <div className="space-y-6">
        {/* Selected Company Card */}
        <Card className="border border-border/80 rounded-2xl shadow-sm bg-card p-5">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Primary Learning Institution
            </CardTitle>
            <CardDescription className="text-xs">
              The company academy currently providing your sessions and coursework.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3 pt-2">
            {selectedCompany ? (
              <div className="p-3 bg-muted/40 rounded-xl border border-border/60 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-foreground">{selectedCompany.name}</p>
                  <p className="text-[10px] font-mono text-muted-foreground">Code: {selectedCompany.code}</p>
                </div>
                <Badge className="bg-primary text-primary-foreground font-semibold text-[10px]">
                  Enrolled
                </Badge>
              </div>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-400">
                You haven't selected a learning institution yet. Browse registered companies to choose one.
              </div>
            )}

            {onBrowseCompaniesClick && (
              <Button
                variant="outline"
                size="sm"
                onClick={onBrowseCompaniesClick}
                className="w-full text-xs font-semibold border-primary/40 text-primary hover:bg-primary/10"
              >
                <Building2 className="h-3.5 w-3.5 mr-1.5" />
                Browse & Switch Institutions
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Security & Cryptographic ID */}
        <Card className="border border-border/80 rounded-2xl shadow-sm bg-card p-5">
          <CardHeader className="p-0 pb-3">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Cryptographic Student Identity
            </CardTitle>
            <CardDescription className="text-xs">
              Universal scholar identifier for tamper-evident certificates.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 space-y-3 pt-2 text-xs">
            <div>
              <label className="block font-semibold mb-1 text-[10px] uppercase text-muted-foreground">
                Account UUID
              </label>
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/70 bg-muted/40 font-mono text-xs">
                <span className="truncate">{profile.id}</span>
                <button
                  type="button"
                  onClick={copyUserId}
                  className="p-1 hover:text-primary transition-colors shrink-0 ml-2"
                  title="Copy full UUID"
                >
                  {copiedId ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block font-semibold mb-1 text-[10px] uppercase text-muted-foreground">
                Platform Roles
              </label>
              <div className="flex flex-wrap gap-1.5">
                {roles.map((r) => (
                  <Badge key={r} variant="secondary" className="text-[10px] uppercase font-bold">
                    {r}
                  </Badge>
                ))}
                {isPlatformAdmin && (
                  <Badge className="bg-primary text-primary-foreground text-[10px] uppercase font-bold">
                    Platform Super Admin
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
