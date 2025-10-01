import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Terms = () => {
  const { t } = useTranslation();
  const effectiveDate = new Date().toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <section className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-4">
          <Link to="/" className="text-blue-600 hover:underline">&larr; {t('app.back')}</Link>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">{t('terms.title') || 'Terms and Conditions'}</h1>
        <div className="prose prose-gray dark:prose-invert">
          <p>
            These Terms and Conditions ("Terms") govern your access to and use of this application
            (the "Application"). By accessing or using the Application, you agree to be bound by these
            Terms. If you do not agree to these Terms, do not use the Application.
          </p>

          <h2>1. License and Ownership</h2>
          <p>
            The Application is distributed under the MIT License. A copy of the license is included in the
            project repository in the LICENSE file. In summary, the MIT License permits reuse, modification,
            and distribution of the software with minimal restrictions and without warranty of any kind.
          </p>
          <p>
            Copyright and other intellectual property rights in the Application remain with the respective
            authors and contributors. Your use of the Application does not transfer any ownership rights.
          </p>

          <h2>2. Acceptable Use</h2>
          <ul>
            <li>Do not use the Application for any unlawful, harmful, or abusive purpose.</li>
            <li>Do not attempt to probe, scan, or test the vulnerability of the Application without authorization.</li>
            <li>Do not interfere with or disrupt the integrity or performance of the Application.</li>
            <li>If you create an account or submit information, you are responsible for its accuracy and security.</li>
          </ul>

          <h2>3. Data Collection and Processing</h2>
          <p>
            The Application may collect and process personal and business information that you provide
            through forms, uploads, or integrations. Examples include contact details, questionnaire
            responses, and attachments you submit.
          </p>

          <h3>3.1 Storage in Google Cloud Firestore</h3>
          <p>
            Submitted data may be stored in Google Cloud Firestore to support core functionality such as
            saving questionnaires, submissions, and related metadata. Firestore is a cloud database service
            provided by Google. Your data may be processed and stored on servers located in various regions
            depending on the project configuration.
          </p>

          <h3>3.2 Integration with Atlassian JIRA</h3>
          <p>
            When enabled, the Application can create or update issues in Atlassian JIRA using the data you
            submit (for example, creating a lead/ticket with your responses). This may include transmitting
            your provided details and attachments to JIRA. The data stored in JIRA is subject to the
            policies and configuration of the connected JIRA workspace/account.
          </p>

          <h3>3.3 Purposes of Processing</h3>
          <ul>
            <li>To operate and improve the Application.</li>
            <li>To create support, sales, or project tracking records in JIRA as requested by you or your organization.</li>
            <li>To maintain records of submissions for auditing, customer support, and analytics.</li>
          </ul>

          <h3>3.4 Data Retention</h3>
          <p>
            Data stored in Firestore and JIRA will be retained for as long as necessary to fulfill the
            purposes outlined above or as required by applicable law, internal policy, or contractual
            obligations. You may request deletion of your data where applicable and subject to technical
            feasibility and legal obligations.
          </p>

          <h3>3.5 Access and Security</h3>
          <p>
            Reasonable administrative, technical, and physical safeguards are used to protect data processed
            by the Application. Access to Firestore and JIRA data is restricted to authorized personnel and
            service accounts required to operate the Application and its integrations. Nonetheless, no method
            of transmission or storage is 100% secure, and we cannot guarantee absolute security.
          </p>

          <h3>3.6 Third‑Party Services</h3>
          <p>
            Use of Google Cloud Firestore and Atlassian JIRA is subject to Google and Atlassian terms and
            privacy policies. Your use of those services, whether directly or via this Application, may be
            governed by:
          </p>
          <ul>
            <li><a href="https://cloud.google.com/terms" target="_blank" rel="noreferrer">Google Cloud Terms</a> and <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">Google Privacy Policy</a></li>
            <li><a href="https://www.atlassian.com/legal" target="_blank" rel="noreferrer">Atlassian Legal Terms</a> and <a href="https://www.atlassian.com/legal/privacy-policy" target="_blank" rel="noreferrer">Atlassian Privacy Policy</a></li>
          </ul>

          <h2>4. User Content</h2>
          <p>
            You are responsible for the content you submit. By submitting content, you represent that you
            have the necessary rights and permissions to do so and that your submission does not infringe
            any third‑party rights or violate applicable laws.
          </p>

          <h2>5. Disclaimer of Warranties</h2>
          <p>
            THE APPLICATION IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING
            BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
            NONINFRINGEMENT. THIS DISCLAIMER IS CONSISTENT WITH THE MIT LICENSE.
          </p>

          <h2>6. Limitation of Liability</h2>
          <p>
            IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
            LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
            CONNECTION WITH THE APPLICATION OR THE USE OR OTHER DEALINGS IN THE APPLICATION.
          </p>

          <h2>7. Changes to the Application or Terms</h2>
          <p>
            We may modify or discontinue features of the Application at any time. We may also update these
            Terms from time to time. Material changes will be indicated by updating the "Effective Date"
            below. Your continued use of the Application after changes become effective constitutes
            acceptance of the updated Terms.
          </p>

          <h2>8. Contact</h2>
          <p>
            For questions about these Terms or data practices, contact your application administrator or the
            project maintainers as indicated in the project documentation or repository.
          </p>

          <p><strong>Effective Date:</strong> {effectiveDate}</p>
          <p>
            <a href="/LICENSE" target="_blank" rel="noreferrer">View MIT License</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default Terms;
