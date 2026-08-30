import { LegalLayout } from "@/components/legal-layout";

export default function PrivacyPolicyPage() {
  return (
    <LegalLayout
      title="Privacy Policy"
      description="Learn how Houston Mobile Mechanic collects, uses, protects, and retains customer information."
      lastUpdated="August 26, 2026"
    >
      <h1>Privacy Policy</h1>
      <p>
        Houston Mobile Mechanic (“Houston Mobile Mechanic,” “we,” “us,” or “our”) provides mobile automotive
        repair, roadside assistance, service-call coordination, appointment deposits, customer receipts, and related
        website features in the Houston, Texas area. This Privacy Policy explains how we handle information when you
        visit our website, request service, make a payment, communicate with us, or use a private tracking or receipt
        link.
      </p>

      <h2>Information we collect</h2>
      <p>Depending on how you use the website, we may collect:</p>
      <ul>
        <li>
          <strong>Contact and service information:</strong> your name, phone number, email address, service location,
          vehicle type, requested service, issue description, urgency, and notes you provide.
        </li>
        <li>
          <strong>Payment information:</strong> payment and transaction details needed to confirm a deposit or
          purchase. Payment card details are handled by our payment processor and are not stored by us.
        </li>
        <li>
          <strong>Service records:</strong> appointment details, technician assignments, deposits, receipts, service
          notes, customer communications, and tracking-link activity.
        </li>
        <li>
          <strong>Phone-intake information:</strong> if you call a configured intake line and consent to recording,
          the call recording, caller number, transcript, and a service-request draft may be collected for review.
        </li>
        <li>
          <strong>Technical information:</strong> information your browser sends to the website, such as device,
          browser, approximate location derived from network information, and security or error logs.
        </li>
      </ul>

      <h2>How we use information</h2>
      <p>We use information to:</p>
      <ul>
        <li>Respond to service requests and communicate about appointments, estimates, dispatch, and receipts.</li>
        <li>Coordinate technicians and provide eligible customers with private tracking links.</li>
        <li>Process deposits and purchases, prevent fraud, and maintain transaction records.</li>
        <li>Review consented phone recordings and transcripts to prepare service-call information for staff review.</li>
        <li>Protect the website, investigate misuse, comply with legal obligations, and improve our services.</li>
      </ul>

      <h2>Service providers and sharing</h2>
      <p>
        We may share information with service providers that help us operate the website and deliver requested
        services. These providers receive only the information needed for their function and may process it under their
        own privacy terms:
      </p>
      <ul>
        <li>
          <strong>Stripe:</strong> processes appointment deposits and parts-shop payments. We do not store full card
          numbers.
        </li>
        <li>
          <strong>Twilio:</strong> may deliver transactional SMS messages and, when the phone-intake feature is
          enabled, carry calls and store recordings for processing.
        </li>
        <li>
          <strong>OpenAI services:</strong> may process consented audio or service-request text to create
          transcriptions or structured intake drafts when those features are used.
        </li>
        <li>
          <strong>Clerk:</strong> supports secure sign-in for authorized technician and staff portal users.
        </li>
        <li>
          <strong>Replit and infrastructure providers:</strong> host the website, application data, and security
          systems needed to operate the service.
        </li>
        <li>
          <strong>Parts marketplaces or sellers:</strong> if you follow a third-party parts listing or purchase from a
          third-party seller, that transaction is governed by the seller’s privacy policy and terms.
        </li>
      </ul>
      <p>
        We do not sell customer personal information. We may disclose information when required by law, to protect
        our rights or customers, or as part of a business transfer such as a merger or sale.
      </p>

      <h2>Text messages and phone calls</h2>
      <p>
        If you give us a phone number, we may use it for service-related calls and messages, including appointment
        updates, technician notifications, tracking links, and receipt links. Message and data rates may apply. You can
        ask us to stop non-essential messages by calling us at{" "}
        <a href="tel:8329301444">(832) 930-1444</a>. Operational messages needed to complete or document a requested
        service may still be sent.
      </p>
      <p>
        Phone-intake calls are recorded only when the recording notice is provided and you continue after that notice.
        You may decline recording by hanging up and using the website contact form or calling us another way.
      </p>

      <h2>Tracking and receipt links</h2>
      <p>
        Private tracking and receipt links are designed to work without a customer account. Anyone who obtains a valid
        link may be able to view the information associated with it, so do not share these links publicly. Tracking
        links may show service progress and a live-location status; they are not intended to expose raw technician GPS
        coordinates. Receipt links expire according to the link terms shown by the website.
      </p>

      <h2>Security and retention</h2>
      <p>
        We use access controls, encrypted connections, provider security tools, and role-based staff access intended to
        protect information. No online system can be guaranteed completely secure.
      </p>
      <p>
        We retain information for as long as reasonably needed to provide services, maintain financial and business
        records, resolve disputes, meet legal obligations, and protect the website. Consent-based phone recordings are
        scheduled for deletion after the configured retention period, unless a longer period is legally required or
        needed for an unresolved matter.
      </p>

      <h2>Your choices and rights</h2>
      <p>
        Depending on where you live, you may have rights to request access to, correction of, deletion of, or a copy
        of personal information we hold about you. You may also ask questions about our handling of your information.
        To make a request, call <a href="tel:8329301444">(832) 930-1444</a> or use the website’s service-request
        form. We may need to verify your identity before completing a request.
      </p>

      <h2>Children</h2>
      <p>
        Our services are intended for adults and vehicle owners or authorized operators. We do not knowingly collect
        personal information from children under 13.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this Privacy Policy as our services or legal obligations change. The “Last updated” date above
        identifies the current version. If a change is material, we will provide notice through the website or another
        reasonable method when required.
      </p>

      <h2>Contact</h2>
      <p>
        Questions or privacy requests can be directed to Houston Mobile Mechanic by phone at{" "}
        <a href="tel:8329301444">(832) 930-1444</a> or through the service-request form on our website.
      </p>
    </LegalLayout>
  );
}