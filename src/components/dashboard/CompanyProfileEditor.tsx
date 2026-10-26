import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Save,
  Mail,
  Phone,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Shield,
  FileText,
  Sparkles,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getCompanyProfileFn,
  updateCompanyProfileFn,
  type CompanySummary,
} from "@/lib/company.functions";

interface CompanyProfileEditorProps {
  institutionId?: string;
  isSuperAdmin?: boolean;
}

export function CompanyProfileEditor({
  institutionId,
  isSuperAdmin = false,
}: CompanyProfileEditorProps) {
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["company-profile", institutionId],
    queryFn: () => getCompanyProfileFn({ data: { institution_id: institutionId } }),
  });

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "");
      setCode(profile.code || "");
      setEmail(profile.contact_email || "");
      setPhoneNumber(profile.phone_number || "");
      setDescription(profile.description || "");
      setAddress(profile.address || "");
      setAvatarUrl(profile.avatar_url || "");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateCompanyProfileFn({
        data: {
          institution_id: (profile?.id || institutionId)!,
          name: name.trim(),
          code: code.trim().toUpperCase(),
          contact_email: email.trim(),
          phone_number: phoneNumber.trim(),
          description: description.trim(),
          address: address.trim(),
          avatar_url: avatarUrl.trim(),
        },
      }),
    onSuccess: () => {
      setSaveSuccess(true);
      void queryClient.invalidateQueries({ queryKey: ["company-profile", institutionId] });
      void queryClient.invalidateQueries({ queryKey: ["institutions"] });
      void queryClient.invalidateQueries({ queryKey: ["public-companies"] });
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  if (isLoading) {
    return (
      <Card className="p-8 text-center animate-pulse border-border/80">
        <p className="text-xs text-muted-foreground">Loading company profile…</p>
      </Card>
    );
  }

  if (!profile && !institutionId) {
    return (
      <Card className="border-dashed border-border/80 p-8 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40 mb-2" />
        <h3 className="font-bold text-sm text-foreground">No Company Selected</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Select a company or register one to manage its organizational profile.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border border-border/80 rounded-2xl shadow-sm bg-card overflow-hidden">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-primary/15 via-primary/5 to-muted/40 p-6 border-b border-border/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-14 w-14 rounded-2xl bg-primary/20 text-primary border border-primary/30 flex items-center justify-center font-bold text-lg shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt={name} className="h-full w-full rounded-2xl object-cover" />
            ) : (
              (name.slice(0, 2) || "CO").toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-black text-foreground">{name || "Company Profile"}</h2>
              <Badge className="bg-emerald-600 text-white font-mono text-[10px] font-bold">
                {profile?.status || "Active"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-mono">Tenant Code: {code || "CODE"}</p>
          </div>
        </div>

        <Badge variant="outline" className="text-xs px-3 py-1 font-semibold self-start sm:self-auto">
          {profile?.course_count ?? 0} Published Sessions
        </Badge>
      </div>

      {/* Profile Form */}
      <CardContent className="p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateMutation.mutate();
          }}
          className="space-y-4 text-xs"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-semibold text-foreground">Company / Academy Name</label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Safaricom Academy"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-foreground">Tenant Code</label>
              <input
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. SAFARICOM"
                className="w-full font-mono uppercase rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="block font-semibold text-foreground flex items-center gap-1">
                <Mail className="h-3 w-3 text-primary" /> Official Contact Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@company.co.ke"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="space-y-1">
              <label className="block font-semibold text-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 text-emerald-600" /> Official Phone / M-Pesa Till
              </label>
              <input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="0712345678"
                className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 text-primary" /> Physical Campus / Headquarters Address
            </label>
            <input
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Westlands Commercial Center, Nairobi, Kenya"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-foreground">Company Bio & Accreditation Statement</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your academy, training specialties, faculty credentials and certifications..."
              className="w-full rounded-xl border border-input bg-background p-3 text-xs focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="block font-semibold text-foreground">Logo / Brand Image URL (Optional)</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {saveSuccess && (
            <p className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4" /> Company profile updated successfully!
            </p>
          )}

          {updateMutation.error && (
            <p className="text-xs text-destructive font-medium flex items-center gap-1">
              <AlertCircle className="h-4 w-4" /> {updateMutation.error.message}
            </p>
          )}

          <div className="pt-2 flex justify-end">
            <Button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-primary text-primary-foreground font-semibold text-xs"
            >
              <Save className="h-3.5 w-3.5 mr-1.5" />
              {updateMutation.isPending ? "Saving Profile…" : "Save Company Profile"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
