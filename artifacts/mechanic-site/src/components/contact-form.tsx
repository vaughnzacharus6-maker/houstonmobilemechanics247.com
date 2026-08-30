import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDeposit, useSubmitContact } from "@workspace/api-client-react";
import {
  AlertCircle,
  BatteryCharging,
  CarFront,
  CheckCircle,
  CreditCard,
  Loader2,
  MapPin,
  Phone,
  ShieldCheck,
  Siren,
  Wrench,
} from "lucide-react";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const vehicleTypes = [
  "Sedan",
  "SUV",
  "Pickup Truck",
  "Van / Minivan",
  "Semi Truck / Big Rig",
  "Box Truck",
  "Fleet Vehicle",
  "Other",
];

const serviceChoices = [
  { value: "Tire Change / Flat", label: "Flat tire", icon: CarFront },
  { value: "Battery / Electrical", label: "Battery issue", icon: BatteryCharging },
  { value: "Brake Repair", label: "Brake concern", icon: Wrench },
  { value: "Engine Diagnostics", label: "Check engine", icon: Wrench },
  { value: "A/C / Cooling System", label: "A/C or overheating", icon: Wrench },
  { value: "Emergency Roadside", label: "Roadside emergency", icon: Siren },
];

const allServiceTypes = [
  ...serviceChoices.map((choice) => choice.value),
  "Oil Change / Fluid Service",
  "Fuel System",
  "Transmission Service",
  "Alternator / Starter",
  "Commercial / Semi Truck Service",
  "Other",
];

const formSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name.").max(120),
  phone: z.string().trim().min(7, "Please enter a phone number we can call.").max(40),
  email: z.string().trim().email("Please enter a valid email address.").or(z.literal("")),
  vehicleType: z.string().min(1, "Choose your vehicle type."),
  serviceType: z.string().min(1, "Choose the help you need."),
  location: z.string().trim().min(3, "Enter an address, intersection, or Houston-area location.").max(500),
  urgency: z.enum(["routine", "soon", "urgent"]),
  description: z.string().trim().min(10, "Tell us a little more so we can prepare.").max(2000),
});

type FormValues = z.infer<typeof formSchema>;

const inputClass =
  "w-full bg-background border border-border text-foreground placeholder:text-muted-foreground px-4 py-3 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50";

export default function ContactForm() {
  const submitContact = useSubmitContact();
  const depositMutation = useCreateDeposit();
  const [depositError, setDepositError] = useState("");

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      vehicleType: "",
      serviceType: "",
      location: "",
      urgency: "soon",
      description: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    submitContact.mutate({
      data: {
        name: values.name.trim(),
        phone: values.phone.trim(),
        email: values.email.trim() || null,
        vehicleType: values.vehicleType,
        serviceType: values.serviceType,
        location: values.location.trim(),
        urgency: values.urgency,
        description: values.description.trim(),
        notes: null,
      },
    });
  };

  const handleDeposit = async () => {
    setDepositError("");
    const hasContactDetails = await form.trigger(["name", "phone"]);
    if (!hasContactDetails) {
      setDepositError("Please enter your name and phone number before opening checkout.");
      return;
    }

    const values = form.getValues();
    depositMutation.mutate(
      {
        data: {
          customerEmail: values.email.trim() || null,
          customerName: values.name.trim(),
          serviceType: values.serviceType || null,
          vehicleType: values.vehicleType || null,
        },
      },
      {
        onSuccess: (result) => {
          if (result.url) window.location.assign(result.url);
        },
        onError: () => setDepositError("Checkout could not open. Please call us at (832) 930-1444."),
      },
    );
  };

  if (submitContact.isSuccess) {
    return (
      <section id="contact" className="bg-background px-4 py-24 md:py-32" data-testid="section-help-request">
        <div className="container mx-auto max-w-2xl">
          <div className="border border-primary/30 bg-card p-8 text-center shadow-[0_12px_45px_-20px_rgba(249,115,22,0.35)]">
            <CheckCircle className="mx-auto mb-5 h-14 w-14 text-primary" />
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">Request received</p>
            <h2 className="mt-2 font-serif text-4xl text-white">We’re on it.</h2>
            <p className="mx-auto mt-4 max-w-lg leading-relaxed text-muted-foreground">
              We’ll review your service details and confirm the next step. If you’re in an unsafe situation or need immediate roadside help, call us now.
            </p>
            <a
              href="tel:8329301444"
              className="mt-7 inline-flex items-center gap-3 bg-primary px-6 py-4 font-serif text-2xl tracking-widest text-primary-foreground transition-colors hover:bg-primary/90"
              data-testid="link-call-after-request"
            >
              <Phone className="h-5 w-5" />
              (832) 930-1444
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="contact" className="relative bg-background py-24 md:py-32" data-testid="section-help-request">
      <div className="absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-primary to-transparent opacity-50" />
      <div className="container relative mx-auto px-4 md:px-6">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div className="lg:pt-6">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-primary">Get help fast</p>
            <h2 className="mt-2 font-serif text-5xl leading-[0.95] text-white md:text-6xl">Tell us what’s happening.</h2>
            <p className="mt-6 max-w-xl leading-relaxed text-muted-foreground">
              Start with the problem, then share your vehicle and location. We use these details to prepare for the right service—not to promise an ETA before dispatch.
            </p>

            <a
              href="tel:8329301444"
              className="mt-8 inline-flex items-center gap-4 border border-primary/30 bg-primary/10 px-5 py-4 text-primary transition-colors hover:bg-primary/20"
              data-testid="link-call-help-now"
            >
              <span className="rounded-full bg-primary p-2 text-primary-foreground">
                <Phone className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Unsafe or urgent?</span>
                <span className="font-serif text-2xl tracking-widest">(832) 930-1444</span>
              </span>
            </a>

            <div className="mt-10 space-y-4 border-l border-primary/30 pl-5 text-sm text-muted-foreground">
              {[
                "Share the issue and your location.",
                "We review the request and confirm the right next step.",
                "You receive a quote before work begins.",
                "Once dispatched, eligible calls can receive a private tracking link.",
              ].map((item, index) => (
                <div key={item} className="flex items-start gap-3" data-testid={`text-request-step-${index + 1}`}>
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/40 text-[10px] font-bold text-primary">
                    {index + 1}
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-10 border border-border bg-card/60 p-5">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-xl text-white">Appointment deposit</h3>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                A $50 deposit can lock in a confirmed appointment and is applied to your total. We’ll never charge you a deposit just for sending this request.
              </p>
              <p className="mt-3 border-l-2 border-primary/60 pl-3 text-xs leading-relaxed text-foreground/80">
                Deposits and service payments are non-refundable once processed, except where required by law or when
                we cannot provide the confirmed service.{" "}
                <a href="/refund-policy" className="font-semibold text-primary underline-offset-2 hover:underline">
                  View our no-refund policy.
                </a>
              </p>
            </div>
          </div>

          <div className="border border-border bg-card p-5 shadow-2xl sm:p-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8" data-testid="form-get-help-fast">
                <fieldset className="space-y-4">
                  <legend className="font-serif text-2xl text-white">
                    <span className="mr-2 text-primary">01</span> What do you need?
                  </legend>
                  <p className="text-sm text-muted-foreground">Choose the closest match. You can add more detail below.</p>
                  <FormField
                    control={form.control}
                    name="serviceType"
                    render={({ field }) => (
                      <FormItem>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {serviceChoices.map((choice) => {
                            const Icon = choice.icon;
                            const selected = field.value === choice.value;
                            return (
                              <button
                                key={choice.value}
                                type="button"
                                onClick={() => field.onChange(choice.value)}
                                className={`flex min-h-24 flex-col items-start justify-between border p-3 text-left text-xs font-bold uppercase tracking-wide transition-colors ${
                                  selected
                                    ? "border-primary bg-primary/15 text-primary"
                                    : "border-border bg-background text-muted-foreground hover:border-primary/50 hover:text-foreground"
                                }`}
                                data-testid={`button-service-${choice.value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-")}`}
                              >
                                <Icon className="h-5 w-5" />
                                <span>{choice.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        <FormControl>
                          <select
                            {...field}
                            className={`${inputClass} mt-3`}
                            data-testid="select-service-type"
                          >
                            <option value="">Or choose a service…</option>
                            {allServiceTypes.map((service) => (
                              <option key={service} value={service}>{service}</option>
                            ))}
                          </select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>

                <fieldset className="space-y-4 border-t border-border pt-7">
                  <legend className="font-serif text-2xl text-white">
                    <span className="mr-2 text-primary">02</span> Where and when?
                  </legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="vehicleType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vehicle type</FormLabel>
                          <FormControl>
                            <select {...field} className={inputClass} data-testid="select-vehicle-type">
                              <option value="">Select type…</option>
                              {vehicleTypes.map((vehicle) => <option key={vehicle} value={vehicle}>{vehicle}</option>)}
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="urgency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>How soon do you need help?</FormLabel>
                          <FormControl>
                            <select {...field} className={inputClass} data-testid="select-request-urgency">
                              <option value="routine">Schedule it</option>
                              <option value="soon">Today or soon</option>
                              <option value="urgent">Urgent roadside help</option>
                            </select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <MapPin className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-primary" />
                            <Input {...field} placeholder="Address, intersection, or Houston-area neighborhood" className={`${inputClass} pl-10`} data-testid="input-request-location" />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>

                <fieldset className="space-y-4 border-t border-border pt-7">
                  <legend className="font-serif text-2xl text-white">
                    <span className="mr-2 text-primary">03</span> How can we reach you?
                  </legend>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Your name</FormLabel>
                          <FormControl><Input {...field} placeholder="Your name" className={inputClass} data-testid="input-request-name" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone number</FormLabel>
                          <FormControl><Input {...field} type="tel" placeholder="(832) 930-1444" className={inputClass} data-testid="input-request-phone" /></FormControl>
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
                        <FormLabel>Email <span className="text-muted-foreground">(optional)</span></FormLabel>
                        <FormControl><Input {...field} type="email" placeholder="you@example.com" className={inputClass} data-testid="input-request-email" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>What’s happening?</FormLabel>
                        <FormControl>
                          <Textarea
                            {...field}
                            rows={4}
                            placeholder="Share symptoms, warning lights, whether the vehicle is safe to drive, or anything else that will help us prepare."
                            className={inputClass}
                            data-testid="input-request-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </fieldset>

                {submitContact.isError && (
                  <div className="flex gap-2 border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" data-testid="status-request-error">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    Something went wrong. Please call us directly at (832) 930-1444.
                  </div>
                )}

                <div className="grid gap-3 border-t border-border pt-6 sm:grid-cols-2">
                  <button
                    type="submit"
                    disabled={submitContact.isPending}
                    className="flex min-h-12 items-center justify-center gap-2 border border-primary bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid="button-submit-help-request"
                  >
                    {submitContact.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Siren className="h-4 w-4" />}
                    {submitContact.isPending ? "Sending request…" : "Send request"}
                  </button>
                  <button
                    type="button"
                    onClick={handleDeposit}
                    disabled={depositMutation.isPending}
                    className="flex min-h-12 items-center justify-center gap-2 border border-primary/40 bg-primary/10 px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-primary transition-colors hover:bg-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
                    data-testid="button-open-deposit-checkout"
                  >
                    {depositMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                    {depositMutation.isPending ? "Opening checkout…" : "Pay $50 deposit"}
                  </button>
                </div>
                {depositError && <p className="text-sm text-destructive" data-testid="status-deposit-error">{depositError}</p>}
                <p className="text-center text-xs leading-relaxed text-muted-foreground">
                  A deposit is only for a confirmed appointment and is applied to your final bill. For urgent roadside situations, call <a href="tel:8329301444" className="font-semibold text-primary hover:underline" data-testid="link-call-from-request-form">(832) 930-1444</a>.
                </p>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
}