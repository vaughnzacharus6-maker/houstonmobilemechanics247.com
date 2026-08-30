import { LegalLayout } from "@/components/legal-layout";

export default function TermsOfServicePage() {
  return (
    <LegalLayout
      title="Terms of Service"
      description="Review the terms for using the Houston Mobile Mechanic website, requesting service, and making payments."
      lastUpdated="August 26, 2026"
    >
      <h1>Terms of Service</h1>
      <p>
        These Terms of Service (“Terms”) govern your use of the Houston Mobile Mechanic website and your requests for
        mobile mechanic, roadside, fleet, parts, appointment, receipt, and related services. By using the website or
        requesting service, you agree to these Terms. If you do not agree, do not use the website.
      </p>

      <h2>Our services</h2>
      <p>
        Houston Mobile Mechanic provides mobile automotive services in and around Houston, Texas. Website descriptions,
        service categories, availability, estimates, response times, and technician assignments are informational until
        confirmed by us. A submitted request is not by itself an appointment or a promise that a particular repair,
        time, price, or technician is available.
      </p>
      <p>
        Service outcomes may depend on the vehicle’s condition, hidden defects, parts availability, weather, traffic,
        location access, safety conditions, and other factors outside our control. You are responsible for promptly
        telling us about known hazards, vehicle modifications, warning lights, prior repairs, and conditions that may
        affect safe service.
      </p>

      <h2>Requests and customer responsibilities</h2>
      <ul>
        <li>Provide accurate contact, vehicle, location, and service information.</li>
        <li>Be authorized to request work on the vehicle and to approve the requested services.</li>
        <li>Provide safe and lawful access to the vehicle and service location.</li>
        <li>Review the quote and scope of work before work begins.</li>
        <li>Do not use the website for fraud, harassment, unlawful activity, scraping, or unauthorized access.</li>
      </ul>
      <p>
        For an urgent or unsafe roadside situation, move to a safe location and contact emergency services when
        appropriate. Our website and phone line are not a substitute for emergency services.
      </p>

      <h2>Payments and appointment deposits</h2>
      <p>
        When offered, a $50 appointment deposit is used to lock in a confirmed appointment and is applied to the final
        service total. We do not charge a deposit merely because you submit a service request. Payment details are
        processed by Stripe or another payment provider identified at checkout.
      </p>
      <p>
        Prices, taxes, parts, labor, travel, and other charges will be shown in the applicable quote, checkout, or
        service record. You authorize us and our payment provider to charge the amount you approve.
      </p>

      <h2 id="refunds">No-refund policy</h2>
      <p>
        <strong>
          Appointment deposits and service payments are non-refundable once processed, except where a refund is required
          by applicable law or Houston Mobile Mechanic is unable to provide the confirmed service and cannot offer a
          reasonable rescheduled appointment.
        </strong>
      </p>
      <p>
        A deposit is applied to the final bill and is not a separate service fee. Cancelling, missing, or changing an
        appointment does not automatically create a refund right. Contact us promptly at{" "}
        <a href="tel:8329301444">(832) 930-1444</a> if a payment or appointment issue occurs so we can review the
        specific circumstances.
      </p>
      <p>
        Parts or products purchased from a third-party marketplace or seller are subject to that seller’s return and
        refund policy. We do not control third-party fulfillment, shipping, availability, or returns.
      </p>

      <h2>Communications and private links</h2>
      <p>
        By giving us your phone number, you agree that we may contact you about your requested service, appointment,
        technician dispatch, tracking link, receipt, or payment. Message and data rates may apply. You may request that
        we stop non-essential messages by calling us.
      </p>
      <p>
        Tracking and receipt links may be private but are bearer links: anyone with a valid link may be able to view
        the associated information. Keep them confidential and notify us if you believe a link was shared or accessed
        improperly.
      </p>

      <h2>Intake recordings and AI-assisted drafts</h2>
      <p>
        If a phone-intake recording notice is provided, continuing with the recording means you consent to recording
        and transcription for service-request preparation. AI-assisted transcripts and drafts are reviewed by staff and
        are not final quotes, diagnoses, or approvals. You remain responsible for confirming the details of a service
        request before work is authorized.
      </p>

      <h2>Website content and intellectual property</h2>
      <p>
        The website, brand, text, design, graphics, software, and original content belong to Houston Mobile Mechanic
        or its licensors. You may use the website only for personal or legitimate business service inquiries. You may
        not copy, modify, reverse engineer, interfere with, or misuse the website or its security features.
      </p>

      <h2>Availability and third-party services</h2>
      <p>
        We aim to keep the website and service communications available, but we do not guarantee uninterrupted
        availability, response times, specific repair results, or that every feature will always work. The website may
        link to or rely on third-party services, including payment processors, communication providers, and parts
        sellers. Their services are governed by their own terms and policies.
      </p>

      <h2>Disclaimers and limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, the website and its content are provided without warranties of any
        kind, express or implied. Houston Mobile Mechanic is not responsible for indirect, incidental, special,
        consequential, or lost-profit damages arising from website use, service delays, third-party services, or
        information supplied by a customer.
      </p>
      <p>
        To the maximum extent permitted by law, our total liability arising from a website transaction or service
        request will not exceed the amount you paid for the specific transaction giving rise to the claim. Nothing in
        these Terms limits rights or remedies that cannot legally be limited.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        We may refuse, suspend, or cancel website access or a service request when reasonably necessary to address
        safety concerns, fraud, abuse, nonpayment, unlawful conduct, or a breach of these Terms. Provisions that by
        their nature should continue after termination, including payment obligations, disclaimers, and limitations of
        liability, will continue.
      </p>

      <h2>Changes to these Terms</h2>
      <p>
        We may update these Terms as our services or legal obligations change. The “Last updated” date above identifies
        the current version. Continued use of the website after an update means you accept the revised Terms to the
        extent permitted by law.
      </p>

      <h2>Governing law and contact</h2>
      <p>
        These Terms are governed by the laws of the State of Texas, without regard to conflict-of-law rules, except
        where applicable law requires otherwise. Questions about these Terms can be directed to Houston Mobile Mechanic
        at <a href="tel:8329301444">(832) 930-1444</a> or through the website service-request form.
      </p>
    </LegalLayout>
  );
}