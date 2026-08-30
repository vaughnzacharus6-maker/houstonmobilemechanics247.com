import React, { useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  getGetTechnicianDashboardQueryKey,
  getGetTechnicianProfileQueryKey,
  getListTechniciansQueryKey,
  useGetTechnicianProfile,
  useUpdateTechnicianProfile,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, User, MapPin, Wrench, AlertTriangle, FileText, Phone } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";

const optionalProfileText = (maxLength: number) =>
  z.string().trim().max(maxLength, `Keep this under ${maxLength} characters.`);

const profileSchema = z.object({
  phone: z.string().trim().refine(
    (value) => value === "" || (value.length >= 7 && value.length <= 40 && /\d/.test(value)),
    "Enter a valid phone number or leave it blank.",
  ),
  specialty: optionalProfileText(500),
  baseAddress: optionalProfileText(240),
  serviceArea: optionalProfileText(240),
  tools: optionalProfileText(1000),
  limitations: optionalProfileText(1000),
  bio: optionalProfileText(1000),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function TechnicianProfileEdit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: profile, isLoading } = useGetTechnicianProfile({
    query: { queryKey: getGetTechnicianProfileQueryKey() }
  });
  const updateProfile = useUpdateTechnicianProfile();

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      phone: "",
      specialty: "",
      baseAddress: "",
      serviceArea: "",
      tools: "",
      limitations: "",
      bio: "",
    }
  });

  const initializedRef = useRef(false);

  useEffect(() => {
    if (profile && !initializedRef.current) {
      form.reset({
        phone: profile.phone || "",
        specialty: profile.specialty || "",
        baseAddress: profile.baseAddress || "",
        serviceArea: profile.serviceArea || "",
        tools: profile.tools || "",
        limitations: profile.limitations || "",
        bio: profile.bio || "",
      });
      initializedRef.current = true;
    }
  }, [profile, form]);

  const onSubmit = (values: ProfileFormValues) => {
    updateProfile.mutate({ data: values }, {
      onSuccess: () => {
        toast({
          title: "Profile updated",
          description: "Your profile information has been saved.",
        });
        queryClient.invalidateQueries({ queryKey: getGetTechnicianProfileQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetTechnicianDashboardQueryKey() });
        queryClient.invalidateQueries({ queryKey: getListTechniciansQueryKey() });
      },
      onError: () => {
        toast({
          title: "Update failed",
          description: "There was a problem saving your profile.",
          variant: "destructive",
        });
      }
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-primary">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="bg-card border border-border rounded-lg p-6 sm:p-8 shadow-sm">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-border/50">
          <User className="w-6 h-6 text-primary" />
          <div>
            <h2 className="font-serif text-2xl uppercase tracking-wider text-foreground">My Profile</h2>
            <p className="text-sm text-muted-foreground mt-1">Keep your details current so Dispatch can route the right jobs to you.</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Phone className="w-3 h-3" /> Phone Number
                    </FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        value={field.value || ""}
                        className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow" 
                        placeholder="(832) 555-0199"
                        type="tel"
                        data-testid="input-profile-phone"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="specialty"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <Wrench className="w-3 h-3" /> Specialties & Services
                    </FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        value={field.value || ""}
                        className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow" 
                        placeholder="e.g. Diesel, Diagnostics, AC" 
                        data-testid="input-profile-specialty"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="baseAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Base Address or ZIP
                    </FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        value={field.value || ""}
                        className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow" 
                        placeholder="e.g. 77002 or Downtown Houston" 
                        data-testid="input-profile-baseAddress"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceArea"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                      <MapPin className="w-3 h-3" /> Service Area Range
                    </FormLabel>
                    <FormControl>
                      <input 
                        {...field} 
                        value={field.value || ""}
                        className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow" 
                        placeholder="e.g. 20 mile radius" 
                        data-testid="input-profile-serviceArea"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tools"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <Wrench className="w-3 h-3" /> Available Tools & Equipment
                  </FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      value={field.value || ""}
                      className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow min-h-[80px]" 
                      placeholder="e.g. Heavy duty jack, OBD2 scanner, Air compressor..." 
                      data-testid="input-profile-tools"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="limitations"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3" /> Limitations or Exclusions
                  </FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      value={field.value || ""}
                      className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow min-h-[80px]" 
                      placeholder="e.g. No transmission rebuilds, cannot service European imports..." 
                      data-testid="input-profile-limitations"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                    <FileText className="w-3 h-3" /> Bio / Experience
                  </FormLabel>
                  <FormControl>
                    <textarea 
                      {...field} 
                      value={field.value || ""}
                      className="w-full bg-input border border-border rounded px-4 py-2.5 text-foreground focus:ring-1 focus:ring-primary outline-none transition-shadow min-h-[100px]" 
                      placeholder="Share your professional background..." 
                      data-testid="input-profile-bio"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end pt-6 border-t border-border/50">
              <button 
                type="submit"
                disabled={updateProfile.isPending}
                className="flex items-center gap-2 bg-primary text-primary-foreground px-6 py-2.5 rounded text-[10px] sm:text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-colors disabled:opacity-50 shadow-sm shadow-primary/20"
                data-testid="button-save-profile"
              >
                {updateProfile.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                {updateProfile.isPending ? "SAVING..." : "SAVE PROFILE"}
              </button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}
