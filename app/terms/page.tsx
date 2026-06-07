export const metadata = { title: 'Terms of Service — PrimePasal' }

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
      <p className="text-gray-500 mb-8">Last updated: June 2026</p>

      <div className="space-y-8 text-gray-700 leading-relaxed">
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">1. Acceptance of Terms</h2>
          <p>By using PrimePasal you agree to these Terms of Service. If you do not agree, please do not use our platform.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">2. Account Responsibility</h2>
          <p>You are responsible for maintaining the confidentiality of your account password. You agree not to share your account with others or use another person's account without permission.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">3. Buying & Selling</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Sellers must list only genuine products with accurate descriptions and images.</li>
            <li>PrimePasal reserves the right to remove any listing that violates our policies.</li>
            <li>Customers must provide accurate delivery information to ensure successful delivery.</li>
            <li>All transactions are subject to our return and refund policy.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">4. Payments</h2>
          <p>Payments are processed securely through Khalti, eSewa, or Cash on Delivery. PrimePasal does not store card details. Sellers receive payouts after successful order delivery, minus the applicable platform commission.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">5. Returns & Refunds</h2>
          <p>Items may be returned within 7 days of delivery if they are defective, damaged, or not as described. To initiate a return, visit your order details page or contact our support team.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">6. Prohibited Activities</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Listing counterfeit, illegal, or prohibited items</li>
            <li>Manipulating reviews or seller ratings</li>
            <li>Attempting to defraud buyers, sellers, or PrimePasal</li>
            <li>Using the platform for any unlawful purpose</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">7. Limitation of Liability</h2>
          <p>PrimePasal acts as a marketplace platform and is not responsible for the quality, safety, or legality of items listed by third-party sellers. We facilitate transactions but do not own or warehouse any seller inventory.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">8. Changes to Terms</h2>
          <p>We may update these terms from time to time. Continued use of PrimePasal after changes are posted constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-3">9. Contact</h2>
          <p>For questions about these terms, email <a href="mailto:pasalprime@gmail.com" className="text-amazon-teal hover:underline">pasalprime@gmail.com</a>.</p>
        </section>
      </div>
    </div>
  )
}
