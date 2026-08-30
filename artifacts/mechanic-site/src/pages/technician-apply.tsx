import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSubmitTechnicianApplication } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Wrench, CheckCircle, ArrowLeft, Loader2 } from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

const schema = z.object({
  fullName: z.string().min(1, "Full name is required").max(120),
  phone: z.string().min(7, "Phone number is required").max(40),
  email: z.string().email("Invalid email address"),
  serviceArea: z.string().min(1, "Service area is required").max(160),
  experience: z.string().min(1, "Experience is required").max(120),
  specialties: z.string().min(1, "Specialties are required").max(500),
  availability: z.string().min(1, "Availability is required").max(120),
  introduction: z.string().max(2000).optional(),
});

type FormValues = z.infer<typeof schema>;

export default function TechnicianApplyPage() {
  const submitApp = useSubmitTechnicianApplication();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      phone: "",
      email: "",
      serviceArea: "",
      experience: "",
      specialties: "",
      availability: "",
      introduction: "",
    },
  });

  function onSubmit(data: FormValues) {
    submitApp.mutate({ data });
  }

  if (submitApp.isSuccess) {
    return (
      <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
        <header className="border-b border-white/5 bg-background/95 backdrop-blur-md py-4 shadow-md sticky top-0 z-50">
          <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 cursor-pointer">
              <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-sm skew-x-[-10deg]">
                <Wrench className="text-white w-6 h-6 skew-x-[10deg]" />
              </div>
              <div className="flex flex-col leading-none">
                <span className="font-serif text-2xl uppercase tracking-wider text-white">Houston</span>
                <span className="font-serif text-sm uppercase tracking-widest text-primary">Mobile Mechanic</span>
              </div>
            </Link>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-card border border-border p-8 rounded-lg shadow-xl text-center space-y-6">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <CheckCircle className="w-8 h-8 text-primary" />
            </div>
            <h1 className="font-serif text-3xl uppercase tracking-wider text-white">Application Received</h1>
            <p className="text-muted-foreground leading-relaxed">
              Thanks for applying to join the team. We review applications regularly and will be in touch if your experience matches our current needs.
            </p>
            <Link href="/" className="inline-flex items-center gap-2 bg-primary text-primary-foreground font-bold uppercase tracking-widest text-xs px-6 py-3 rounded-sm hover:bg-primary/90 transition-colors">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="border-b border-white/5 bg-background/95 backdrop-blur-md py-4 shadow-md sticky top-0 z-50">
        <div className="container mx-auto px-4 md:px-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 cursor-pointer">
            <div className="w-10 h-10 bg-primary flex items-center justify-center rounded-sm skew-x-[-10deg]">
              <Wrench className="text-white w-6 h-6 skew-x-[10deg]" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-serif text-2xl uppercase tracking-wider text-white">Houston</span>
              <span className="font-serif text-sm uppercase tracking-widest text-primary">Mobile Mechanic</span>
            </div>
          </Link>
        </div>
      </header>

      <main className="flex-grow py-12 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-10 text-center space-y-4">
            <h1 className="font-serif text-4xl md:text-5xl uppercase tracking-wider text-white">Join the Crew</h1>
            <p className="text-muted-foreground text-lg max-w-lg mx-auto">
              We're looking for experienced, self-driven mechanics who want to control their schedule and earn top pay working directly with customers across Houston.
            </p>
          </div>

          <div className="bg-card border border-border p-6 md:p-8 rounded-lg shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-primary" />
            
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Full Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} className="bg-input border-border focus-visible:ring-primary" data-testid="input-fullname" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Phone Number</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(832) 555-0199" {...field} className="bg-input border-border focus-visible:ring-primary font-mono" data-testid="input-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Email Address</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} className="bg-input border-border focus-visible:ring-primary" data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="serviceArea"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Service Area</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. Katy, Sugar Land, Full Metro" {...field} className="bg-input border-border focus-visible:ring-primary" data-testid="input-servicearea" />
                        </FormControl>
                        <FormDescription className="text-[10px]">Parts of town you can cover</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="experience"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Years of Experience</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g. 5 years, ASE Certified" {...field} className="bg-input border-border focus-visible:ring-primary" data-testid="input-experience" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="specialties"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Specialties & Capabilities</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Diagnostics, heavy duty, standard maintenance..." {...field} className="bg-input border-border focus-visible:ring-primary resize-y min-h-[80px]" data-testid="input-specialties" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="availability"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Availability</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Weekends only, Full time, Evenings" {...field} className="bg-input border-border focus-visible:ring-primary" data-testid="input-availability" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="introduction"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase tracking-widest">A brief introduction (Optional)</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Tell us a bit about yourself..." {...field} className="bg-input border-border focus-visible:ring-primary resize-y min-h-[100px]" data-testid="input-intro" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {submitApp.isError && (
                  <div className="bg-destructive/10 border border-destructive/30 text-destructive p-4 rounded text-sm font-semibold text-center" data-testid="alert-error">
                    Something went wrong. Please check your inputs and try again.
                  </div>
                )}

                <div className="pt-4 border-t border-border">
                  <Button 
                    type="submit" 
                    disabled={submitApp.isPending}
                    className="w-full font-serif uppercase tracking-widest text-lg h-14"
                    data-testid="button-submit-application"
                  >
                    {submitApp.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Application"
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </main>
    </div>
  );
}
