import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Seo from '@/components/Seo';

export default function Privacy() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-6">
      <Seo
        title="Privacy Policy — Syllabix"
        description="How Syllabix handles your data: offline-first storage, what we collect, and your privacy rights."
        path="/privacy"
      />
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <header className="space-y-1">
        <h1 className="text-2xl font-heading font-bold">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 29 May 2026</p>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <div>
          <h2 className="font-semibold text-base mb-1">1. Our Approach</h2>
          <p>Syllabix is built to be offline-first. Most of your work — lesson plans, notes, schemes and drafts — is stored locally on your own device and never leaves it unless you choose to sign in and use cloud or collaboration features.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">2. Information We Collect</h2>
          <p>If you create an account we collect your email address and display name. When you use collaboration features we store the content you choose to share, your school code and your role. We do not sell your personal information.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">3. How We Use Your Data</h2>
          <p>We use your data to operate the app, sync your content across devices, enable school collaboration, and improve the service. AI features send the text you submit to our AI provider solely to generate the requested output.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">4. Data Storage & Security</h2>
          <p>Cloud data is stored securely and protected by access controls so that only you, and where applicable members of your school workspace, can access it. We apply industry-standard safeguards but no system can be guaranteed 100% secure.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">5. Sharing Within Your School</h2>
          <p>When you join a school workspace using a school code, content you share becomes visible to other verified members of that workspace. Higher-ranked members (e.g. headmaster, director, admin) may have additional management permissions.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">6. Your Rights</h2>
          <p>You can edit or delete your locally stored content at any time. Subject to applicable law, you may request access, correction, portability, restriction or deletion of account-related data held in the cloud, and you may object to or withdraw consent for optional analytics. Contact us through the app's support options to make a request.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">7. Cookies, Local Storage & Consent</h2>
          <p>Essential local storage and IndexedDB keep drafts available offline, preserve settings and support installation. These technologies are not used to sell or advertise to you. Optional privacy-friendly analytics are disabled unless you explicitly accept them through the consent banner, and are designed not to include account identifiers, IP addresses or query strings.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">8. Retention & Deletion</h2>
          <p>Local drafts remain on your device until you remove them or clear the app's storage. Cloud account, workspace and shared content are retained only while needed to provide the service, meet legal obligations, resolve disputes and protect the platform. You may request account deletion; some records may be retained where the law requires it.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">9. Uploads & Backups</h2>
          <p>Uploaded files and backups are validated, stored privately and accessible only through authorised, short-lived download links. Do not upload sensitive information unless you need the feature and have a lawful basis to do so. You should keep your own important backup copy.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">10. Children's Privacy</h2>
          <p>Syllabix is intended for use by teachers and educators, not children. We do not knowingly collect personal data from children.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">11. Changes to This Policy</h2>
          <p>We may update this Privacy Policy periodically. We will update the date above when changes are made.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">12. Contact</h2>
          <p>If you have questions about how your data is handled, please reach out through the support options in the app.</p>
        </div>
      </section>
    </div>
  );
}