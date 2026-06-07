export const metadata = { title: 'Privacy Policy — PrimePasal' }

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
      <p className="text-gray-500 mb-8">Last updated: June 2026</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Information We Collect</h2>
          <p>We collect information you provide when you create an account, place an order, or contact support. This includes your name, email address, phone number, delivery address, and payment details.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. How We Use Your Information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To process and deliver your orders</li>
            <li>To send order confirmations and shipping updates</li>
            <li>To provide customer support</li>
            <li>To improve our platform and personalise your experience</li>
            <li>To send promotional offers (you can opt out at any time)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Information Sharing</h2>
          <p>We do not sell your personal information. We share data only with sellers to fulfil your orders, and with payment processors (Khalti, eSewa) to complete transactions. All partners are required to keep your data secure.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Data Security</h2>
          <p>We use industry-standard encryption and security practices to protect your personal information. Passwords are stored using one-way hashing and are never visible to our team.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Cookies</h2>
          <p>We use cookies to keep you logged in and to remember your cart. We do not use third-party advertising cookies.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Your Rights</h2>
          <p>You may request to view, update, or delete your personal data at any time by contacting us at <a href="mailto:pasalprime@gmail.com" className="text-amazon-teal hover:underline">pasalprime@gmail.com</a>.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Contact</h2>
          <p>For privacy-related questions, contact PrimePasal at <a href="mailto:pasalprime@gmail.com" className="text-amazon-teal hover:underline">pasalprime@gmail.com</a> or call <a href="tel:9801772670" className="text-amazon-teal hover:underline">9801772670</a>.</p>
        </section>
      </div>
    </div>
  )
}
