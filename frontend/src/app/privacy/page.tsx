'use client';

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-purple-500 to-cyan-500 bg-clip-text text-transparent">
          Privacy Policy
        </h1>
        <p className="text-slate-400 mb-8">Last updated: December 27, 2025</p>

        <div className="prose prose-invert prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">1. Introduction</h2>
            <p className="text-slate-300 leading-relaxed">
              Money Grind Religion Inc. ("we," "our," or "us") operates the TIME APEX mobile application
              (the "App"). This Privacy Policy explains how we collect, use, disclose, and safeguard your
              information when you use our App.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">2. Information We Collect</h2>
            <h3 className="text-xl font-medium text-purple-400 mb-2">Personal Information</h3>
            <p className="text-slate-300 leading-relaxed mb-4">
              We may collect the following personal information:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Name</li>
              <li>Email address</li>
              <li>Phone number</li>
              <li>Account credentials</li>
            </ul>

            <h3 className="text-xl font-medium text-purple-400 mb-2 mt-6">Device Information</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Device identifiers</li>
              <li>Operating system</li>
              <li>App usage data</li>
            </ul>

            <h3 className="text-xl font-medium text-purple-400 mb-2 mt-6">Usage Data</h3>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Features accessed</li>
              <li>Interactions with the App</li>
              <li>Trading signals viewed</li>
              <li>Portfolio tracking preferences</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">3. How We Use Your Information</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              We use the collected information for:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Providing and maintaining the App</li>
              <li>User account management</li>
              <li>Sending trading signals and alerts</li>
              <li>Push notifications</li>
              <li>Customer support</li>
              <li>App improvement and analytics</li>
              <li>Security and fraud prevention</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">4. Data Sharing</h2>
            <p className="text-slate-300 leading-relaxed">
              We do not sell, trade, or rent your personal information to third parties. We may share
              information with service providers who assist in operating our App, subject to
              confidentiality agreements.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">5. Data Security</h2>
            <p className="text-slate-300 leading-relaxed">
              We implement industry-standard security measures including:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4 mt-4">
              <li>256-bit encryption for data transmission</li>
              <li>Secure data storage</li>
              <li>Face ID and Touch ID authentication</li>
              <li>Regular security audits</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">6. Your Rights</h2>
            <p className="text-slate-300 leading-relaxed mb-4">
              You have the right to:
            </p>
            <ul className="list-disc list-inside text-slate-300 space-y-2 ml-4">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Export your data</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">7. Children's Privacy</h2>
            <p className="text-slate-300 leading-relaxed">
              Our App is not intended for users under 18 years of age. We do not knowingly collect
              information from children under 18.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">8. Changes to This Policy</h2>
            <p className="text-slate-300 leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify you of any changes
              by posting the new Privacy Policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-white mb-4">9. Contact Us</h2>
            <p className="text-slate-300 leading-relaxed">
              If you have questions about this Privacy Policy, please contact us at:
            </p>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
              <p className="text-slate-300">Money Grind Religion Inc.</p>
              <p className="text-slate-300">Email: support@timebeyondus.com</p>
              <p className="text-slate-300">Website: https://timebeyondus.com</p>
            </div>
          </section>
        </div>

        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-500 text-sm">
            © 2025 Money Grind Religion Inc. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
