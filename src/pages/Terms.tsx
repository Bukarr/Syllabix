import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Terms() {
  const navigate = useNavigate();
  return (
    <div className="max-w-2xl mx-auto px-4 py-6 pb-32 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <header className="space-y-1">
        <h1 className="text-2xl font-heading font-bold">Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: 29 May 2026</p>
      </header>

      <section className="space-y-4 text-sm leading-relaxed text-foreground/90">
        <div>
          <h2 className="font-semibold text-base mb-1">1. Acceptance of Terms</h2>
          <p>By using Syllabix, you agree to these Terms of Service. If you do not agree, please discontinue use of the app.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">2. Purpose of the Service</h2>
          <p>Syllabix is a planning and productivity tool for teachers. It helps you create lesson plans, schemes of work, notes and assessments aligned to Nigerian curricula. It is provided as a supportive tool and does not replace your professional judgment.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">3. Accounts</h2>
          <p>Creating an account is optional and only required for school collaboration features. You are responsible for keeping your login credentials secure and for all activity under your account.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">4. Acceptable Use</h2>
          <p>You agree not to misuse the service, attempt to access other users' data without authorization, upload unlawful content, or disrupt the operation of the platform.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">5. AI-Generated Content</h2>
          <p>Some content is generated using AI. While we strive for accuracy and curriculum alignment, you are responsible for reviewing and verifying all generated material before classroom use.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">6. Your Content</h2>
          <p>You retain ownership of the lesson plans, notes and other content you create. By using collaboration features, you grant members of your school workspace access to content you share with them.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">7. Disclaimer & Limitation of Liability</h2>
          <p>The service is provided "as is" without warranties of any kind. To the maximum extent permitted by law, Syllabix and its operators are not liable for any indirect, incidental or consequential damages arising from your use of the app.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">8. Changes to These Terms</h2>
          <p>We may update these Terms from time to time. Continued use after changes constitutes acceptance of the revised Terms.</p>
        </div>
        <div>
          <h2 className="font-semibold text-base mb-1">9. Contact</h2>
          <p>For questions about these Terms, please contact us through the support options in the app.</p>
        </div>
      </section>
    </div>
  );
}