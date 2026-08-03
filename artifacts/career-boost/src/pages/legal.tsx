import { Navbar } from "@/components/layout/Navbar";
import { BottomNav } from "@/components/layout/BottomNav";

const LAST_UPDATED = "2 August 2026";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-lg font-bold mb-2 text-foreground">{title}</h2>
      <div className="text-sm text-muted-foreground space-y-2 leading-relaxed">{children}</div>
    </section>
  );
}

function Legal({ type }: { type: "terms" | "privacy" }) {
  const isTerms = type === "terms";
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-black mb-1 text-foreground">
          {isTerms ? "Terms of Service" : "Privacy Policy"}
        </h1>
        <p className="text-xs text-muted-foreground mb-10">Last updated: {LAST_UPDATED}</p>

        {isTerms ? (
          <>
            <Section title="1. Agreement to Terms">
              <p>
                By creating an account or using Hire Pilot ("we", "our", "the Service"), you agree to these Terms of
                Service. If you do not agree, please do not use the Service.
              </p>
            </Section>
            <Section title="2. The Service">
              <p>
                Hire Pilot is an AI-powered career platform providing resume building, interview practice, job matching,
                career analytics, and related tools. AI-generated content is provided for guidance only and does not
                guarantee employment outcomes.
              </p>
            </Section>
            <Section title="3. Accounts">
              <p>
                You are responsible for keeping your account credentials secure and for all activity under your account.
                You must be at least 16 years old to use the Service.
              </p>
            </Section>
            <Section title="4. Subscriptions & Payments">
              <p>
                Paid plans are billed via UPI on a monthly or yearly cycle. Payments are verified manually before a
                subscription is activated; this usually takes a few hours. Free trials are limited to one per user and
                apply only to yearly plans. You may cancel anytime — access continues until the end of the current period.
                Refunds are issued at our discretion for incorrect or duplicate payments.
              </p>
            </Section>
            <Section title="5. Acceptable Use">
              <p>
                You agree not to misuse the Service, including scraping, abusing AI endpoints, reselling access, or
                uploading content you do not have the right to use.
              </p>
            </Section>
            <Section title="6. Content You Provide">
              <p>
                You retain ownership of the resumes, documents and data you upload. You grant us a limited license to
                process and store that content solely to provide the Service to you.
              </p>
            </Section>
            <Section title="7. Disclaimer & Limitation of Liability">
              <p>
                The Service is provided "as is" without warranties of any kind. We are not liable for any indirect,
                incidental or consequential damages arising from your use of the Service.
              </p>
            </Section>
            <Section title="8. Contact">
              <p>Questions about these terms: support is available via the Support page on the site.</p>
            </Section>
          </>
        ) : (
          <>
            <Section title="1. What We Collect">
              <p>
                Account information (name, email, password hash), resume and document content you upload, usage data
                (feature usage, interview practice), and payment references (UPI transaction IDs) for subscription
                verification. We do not store your UPI PIN or bank credentials.
              </p>
            </Section>
            <Section title="2. How We Use It">
              <p>
                Your data is used to provide the Service: generating resumes and reports, scoring, interview feedback,
                sending transactional emails (trial, payment, renewal, expiry), and preventing abuse.
              </p>
            </Section>
            <Section title="3. AI Processing">
              <p>
                Content you submit may be sent to third-party AI providers to generate responses. Do not upload
                sensitive personal information you are not comfortable sharing with an AI service.
              </p>
            </Section>
            <Section title="4. Sharing">
              <p>
                We do not sell your personal data. Data is shared only with service providers (hosting, email, AI) that
                are necessary to operate the Service, or when required by law.
              </p>
            </Section>
            <Section title="5. Storage & Security">
              <p>
                Data is stored on secured cloud databases. Passwords are hashed, never stored in plain text. No system
                is fully secure, but we apply reasonable protections.
              </p>
            </Section>
            <Section title="6. Your Rights">
              <p>
                You can request a copy or deletion of your account data at any time by contacting us. Deleting your
                account removes your stored content and personal information.
              </p>
            </Section>
            <Section title="7. Contact">
              <p>Privacy questions: support is available via the Support page on the site.</p>
            </Section>
          </>
        )}
      </div>
      <BottomNav />
      <div className="h-16 md:hidden" />
    </div>
  );
}

export default Legal;
