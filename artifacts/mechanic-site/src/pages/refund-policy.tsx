import { LegalLayout } from "@/components/legal-layout";

export default function RefundPolicyPage() {
  return (
    <LegalLayout
      title="No Refund Policy"
      description="Review the Houston Mobile Mechanic policy for appointment deposits, service payments, and third-party parts purchases."
      lastUpdated="August 26, 2026"
    >
      <h1>No Refund Policy</h1>
      <p>
        This policy summarizes the refund terms for Houston Mobile Mechanic appointments, service work, deposits, and
        website purchases. It should be read together with our{" "}
        <a href="/terms-of-service">Terms of Service</a>.
      </p>

      <div className="not-prose my-8 border border-primary/40 bg-primary/10 p-5">
        <p className="text-sm font-bold uppercase tracking-[0.14em] text-primary">All sales are final</p>
        <p className="mt-2 text-sm leading-relaxed text-foreground">
          Appointment deposits and service payments are non-refundable once processed, except where required by law or
          when Houston Mobile Mechanic cannot provide the confirmed service and cannot offer a reasonable rescheduled
          appointment.
        </p>
      </div>

      <h2>Appointment deposits</h2>
      <p>
        When a $50 appointment deposit is requested, it reserves a confirmed appointment and is applied to the final
        service bill. Submitting a request does not itself create a payment obligation. Once paid, the deposit is not
        refundable solely because an appointment is cancelled, missed, or changed.
      </p>

      <h2>Service payments</h2>
      <p>
        Payments for completed or authorized service work are final. If you believe there is a billing error or a
        service issue, contact us promptly at <a href="tel:8329301444">(832) 930-1444</a> so we can review the matter.
        This review does not guarantee a refund.
      </p>

      <h2>Third-party parts purchases</h2>
      <p>
        Parts or products purchased from a third-party marketplace or seller are governed by that seller’s return,
        exchange, warranty, shipping, and refund policies. Houston Mobile Mechanic does not control those policies or
        third-party fulfillment.
      </p>

      <h2>Legally required exceptions</h2>
      <p>
        Nothing in this policy excludes a refund, cancellation right, chargeback right, warranty, or other remedy that
        cannot legally be excluded. Questions about a payment can be directed to Houston Mobile Mechanic at{" "}
        <a href="tel:8329301444">(832) 930-1444</a>.
      </p>
    </LegalLayout>
  );
}