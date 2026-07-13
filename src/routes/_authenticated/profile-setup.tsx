import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MALE_HALLS, FEMALE_HALLS, OTHER_LOCATIONS } from "@/lib/halls";
import { Loader2 } from "lucide-react";

const searchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute("/_authenticated/profile-setup")({
  validateSearch: searchSchema,
  head: () => ({ meta: [{ title: "প্রোফাইল সম্পূর্ণ করুন — পায়রা" }] }),
  component: ProfileSetup,
});

const schema = z.object({
  full_name: z.string().trim().min(2, "নাম কমপক্ষে ২ অক্ষর").max(80),
  phone: z.string().trim().regex(/^01[3-9]\d{8}$/, "সঠিক ফোন নম্বর দিন (01XXXXXXXXX)"),
  hall: z.string().min(1, "হল/স্থান বাছাই করুন"),
  block_room: z.string().trim().min(1, "ব্লক/রুম দিন").max(60),
});

function ProfileSetup() {
  const { user } = Route.useRouteContext();
  const { redirect: redirectTo } = Route.useSearch();
  const navigate = useNavigate();
  const [state, setState] = useState({ full_name: "", phone: "", hall: "", block_room: "" });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (data) {
        setState({
          full_name: data.full_name ?? "",
          phone: data.phone ?? "",
          hall: data.hall ?? "",
          block_room: data.block_room ?? "",
        });
      }
    })();
  }, [user.id]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(state);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "সঠিক তথ্য দিন");
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({ id: user.id, ...parsed.data, profile_complete: true });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("প্রোফাইল সংরক্ষিত হয়েছে");
    navigate({ to: redirectTo ?? "/parcel" });
  }

  return (
    <div className="min-h-screen gradient-hero px-4 py-8">
      <div className="mx-auto flex max-w-md flex-col items-center">
        <Logo />
        <div className="animate-fade-up mt-6 w-full rounded-3xl border border-border/60 bg-card/90 p-6 shadow-card backdrop-blur-lg md:p-8">
          <h1 className="font-bangla text-2xl font-extrabold">প্রোফাইল সম্পূর্ণ করুন</h1>
          <p className="mt-1 font-bangla text-sm text-muted-foreground">
            রাইডার সহজে আপনাকে খুঁজে পাওয়ার জন্য
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="fn">পূর্ণ নাম</Label>
              <Input
                id="fn"
                value={state.full_name}
                onChange={(e) => setState((s) => ({ ...s, full_name: e.target.value }))}
                className="mt-1.5 h-12 rounded-xl"
                required
              />
            </div>
            <div>
              <Label htmlFor="ph">ফোন নম্বর</Label>
              <Input
                id="ph"
                inputMode="tel"
                placeholder="01XXXXXXXXX"
                value={state.phone}
                onChange={(e) => setState((s) => ({ ...s, phone: e.target.value }))}
                className="mt-1.5 h-12 rounded-xl"
                required
              />
            </div>
            <div>
              <Label>হল / স্থান</Label>
              <Select value={state.hall} onValueChange={(v) => setState((s) => ({ ...s, hall: v }))}>
                <SelectTrigger className="mt-1.5 h-12 rounded-xl">
                  <SelectValue placeholder="বাছাই করুন" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroupBn label="ছেলেদের হল" items={MALE_HALLS as unknown as string[]} />
                  <SelectGroupBn label="মেয়েদের হল" items={FEMALE_HALLS as unknown as string[]} />
                  <SelectGroupBn label="অন্যান্য" items={OTHER_LOCATIONS as unknown as string[]} />
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="br">ব্লক / রুম</Label>
              <Input
                id="br"
                placeholder="যেমন: A-Block, Room 204"
                value={state.block_room}
                onChange={(e) => setState((s) => ({ ...s, block_room: e.target.value }))}
                className="mt-1.5 h-12 rounded-xl"
                required
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl gradient-primary text-base font-semibold shadow-soft"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "সংরক্ষণ করুন"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function SelectGroupBn({ label, items }: { label: string; items: string[] }) {
  return (
    <>
      <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {items.map((h) => (
        <SelectItem key={h} value={h}>{h}</SelectItem>
      ))}
    </>
  );
}
